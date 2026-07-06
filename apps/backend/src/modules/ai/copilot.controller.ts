import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsString, ValidateNested } from 'class-validator';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiresPlan } from '../../common/decorators/requires-plan.decorator';
import { JwtAuthGuard, RolesGuard } from '../../common/guards/auth.guards';
import { PlanGuard } from '../../common/guards/plan.guard';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { CopilotContextService } from './copilot-context.service';
import { CopilotToolService } from './copilot-tool.service';
import { buildActivities, getStreamingActivityMeta, OpenAiService } from './openai.service';

class ChatMessage {
  @IsString()
  role: 'user' | 'assistant';

  @IsString()
  content: string;
}

class CopilotDto {
  @IsString()
  message: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessage)
  history: ChatMessage[];
}

@ApiTags('ai')
@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard, PlanGuard)
export class CopilotController {
  constructor(
    private readonly openAiService: OpenAiService,
    private readonly copilotContextService: CopilotContextService,
    private readonly copilotToolService: CopilotToolService,
    private readonly configService: ConfigService,
  ) {}

  @Post('copilot')
  @RequiresPlan('starter')
  async chat(@CurrentUser() user: AuthenticatedUser, @Body() dto: CopilotDto) {
    const tenantId = user.tenantId!;
    if (this.configService.get<boolean>('COPILOT_USE_FUNCTION_CALLING')) {
      const { reply, activities } = await this.openAiService.chatCopilotWithTools(
        tenantId,
        dto.message,
        dto.history,
        this.copilotToolService,
      );
      return { reply, meta: activities.length > 0 ? { activities } : undefined };
    }

    const financialContext = await this.copilotContextService.getFinancialContext(tenantId);
    const reply = await this.openAiService.chatCopilot(dto.message, dto.history, financialContext);
    return { reply };
  }

  @Post('copilot/stream')
  @RequiresPlan('starter')
  async streamChat(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CopilotDto,
    @Res() res: Response,
  ) {
    const tenantId = user.tenantId!;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const writeEvent = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      // flush ngay sau mỗi write để token stream thật sự theo thời gian thực
      (res as unknown as { flush?: () => void }).flush?.();
    };

    try {
      if (!this.configService.get<boolean>('COPILOT_USE_FUNCTION_CALLING')) {
        const financialContext = await this.copilotContextService.getFinancialContext(tenantId);
        const reply = await this.openAiService.chatCopilot(
          dto.message,
          dto.history,
          financialContext,
        );
        writeEvent('done', { reply, meta: undefined });
        return;
      }

      const resultsCapture = new Map<string, unknown>();
      const runner = this.openAiService.createCopilotRunner(
        tenantId,
        dto.message,
        dto.history,
        this.copilotToolService,
        resultsCapture,
      );

      if (!runner) {
        writeEvent('done', {
          reply: 'AI Copilot chưa được cấu hình. Vui lòng liên hệ quản trị viên.',
          meta: undefined,
        });
        return;
      }

      const calledTools: string[] = [];

      runner.on('functionToolCall', (call) => {
        calledTools.push(call.name);
        const meta = getStreamingActivityMeta(call.name);
        if (meta) writeEvent('activity', meta);
      });

      runner.on('content', (delta: string) => {
        if (delta) writeEvent('delta', { content: delta });
      });

      const reply = (await runner.finalContent()) ?? 'Xin lỗi, tôi không thể trả lời lúc này.';
      const activities = buildActivities(calledTools, resultsCapture);
      writeEvent('done', { reply, meta: activities.length > 0 ? { activities } : undefined });
    } catch {
      writeEvent('done', { reply: 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại.', meta: undefined });
    } finally {
      res.end();
    }
  }
}
