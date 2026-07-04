import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import { SettingsService } from '../settings/settings.service';
import {
  EMAIL_JOB_OPTIONS,
  EMAIL_QUEUE,
  EMAIL_SEND_JOB,
  type EmailJobData,
} from './email.constants';
import { SlackService } from './slack.service';

export interface DispatchEmailPayload {
  title: string;
  body: string;
  link: string | null;
}

@Injectable()
export class NotificationDeliveryService {
  private readonly logger = new Logger(NotificationDeliveryService.name);

  constructor(
    private readonly settingsService: SettingsService,
    private readonly configService: ConfigService,
    private readonly slackService: SlackService,
    @InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue<EmailJobData>,
  ) {}

  async enqueueEmailIfEnabled(tenantId: string, payload: DispatchEmailPayload): Promise<void> {
    const config = await this.settingsService.getNotifications(tenantId);

    if (!config.emailEnabled || !config.email?.trim()) {
      return;
    }

    const actionUrl = this.buildActionUrl(payload.link);
    const jobData: EmailJobData = {
      tenantId,
      to: config.email.trim(),
      subject: `[X-Cash AI] ${payload.title}`,
      title: payload.title,
      body: payload.body,
      actionUrl,
    };

    await this.emailQueue.add(EMAIL_SEND_JOB, jobData, EMAIL_JOB_OPTIONS);
    this.logger.debug(`Queued notification email for tenant ${tenantId} → ${jobData.to}`);
  }

  async sendSlackIfEnabled(tenantId: string, payload: DispatchEmailPayload): Promise<void> {
    const config = await this.settingsService.getNotifications(tenantId);

    if (!config.slackEnabled || !config.slackWebhookUrl?.trim()) {
      return;
    }

    const actionUrl = this.buildActionUrl(payload.link);
    await this.slackService.send(config.slackWebhookUrl.trim(), {
      title: payload.title,
      body: payload.body,
      actionUrl,
    });
  }

  private buildActionUrl(link: string | null): string | null {
    if (!link) {
      return null;
    }

    if (link.startsWith('http://') || link.startsWith('https://')) {
      return link;
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const base = frontendUrl.replace(/\/$/, '');
    const path = link.startsWith('/') ? link : `/${link}`;
    return `${base}${path}`;
  }
}
