import { Body, Controller, Headers, Post, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { BankingService } from './banking.service';
import type { CasWebhookDto } from './dto/banking.dto';

@ApiTags('Webhook')
@Controller('webhook')
export class WebhookController {
  constructor(
    private readonly bankingService: BankingService,
    private readonly configService: ConfigService,
  ) {}

  @Post('cas')
  @ApiOperation({ summary: 'Nhận webhook Cas Balance Hook (TRANSACTIONS)' })
  handleCasWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Body() payload: CasWebhookDto,
    @Headers('x-cas-signature') signature?: string,
    @Headers('x-cas-timestamp') timestamp?: string,
  ) {
    const rawBody =
      req.rawBody?.toString('utf8') ??
      (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));

    const configuredHeader = this.configService.get<string>(
      'WEBHOOK_SIGNATURE_HEADER',
      'X-Cas-Signature',
    );
    const signatureHeader =
      signature ?? (req.headers[configuredHeader.toLowerCase()] as string | undefined);

    this.bankingService.verifyWebhookSignature(rawBody, signatureHeader, timestamp);
    return this.bankingService.handleCasWebhook(payload);
  }
}
