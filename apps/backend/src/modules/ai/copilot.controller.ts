import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsString, ValidateNested } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiresPlan } from '../../common/decorators/requires-plan.decorator';
import { JwtAuthGuard, RolesGuard } from '../../common/guards/auth.guards';
import { PlanGuard } from '../../common/guards/plan.guard';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { CopilotContextService } from './copilot-context.service';
import { CopilotToolService } from './copilot-tool.service';
import { OpenAiService } from './openai.service';

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
}
