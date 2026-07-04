import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SlackPayload {
  title: string;
  body: string;
  actionUrl: string | null;
}

@Injectable()
export class SlackService {
  private readonly logger = new Logger(SlackService.name);
  private readonly appName: string;

  constructor(private readonly configService: ConfigService) {
    this.appName = this.configService.get<string>('APP_NAME', 'X-Cash AI');
  }

  async send(webhookUrl: string, payload: SlackPayload): Promise<void> {
    const blocks: unknown[] = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${payload.title}*\n${payload.body}`,
        },
      },
    ];

    if (payload.actionUrl) {
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Xem chi tiết' },
            url: payload.actionUrl,
          },
        ],
      });
    }

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: this.appName,
        blocks,
      }),
    });

    if (!res.ok) {
      throw new Error(`Slack webhook trả về ${res.status}`);
    }

    this.logger.debug(`Slack notification sent via webhook`);
  }
}
