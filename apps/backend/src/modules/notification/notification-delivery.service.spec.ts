import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { EMAIL_QUEUE } from '../../queue/queue.module';
import { SettingsService } from '../settings/settings.service';
import { EMAIL_JOB_OPTIONS, EMAIL_SEND_JOB } from './email.constants';
import { NotificationDeliveryService } from './notification-delivery.service';
import { SlackService } from './slack.service';

describe('NotificationDeliveryService', () => {
  let service: NotificationDeliveryService;

  const settingsService = {
    getNotifications: jest.fn(),
  };

  const emailQueue = {
    add: jest.fn().mockResolvedValue(undefined),
  };

  const slackService = {
    send: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationDeliveryService,
        { provide: SettingsService, useValue: settingsService },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, defaultValue?: string) =>
              key === 'FRONTEND_URL' ? 'http://localhost:5173' : defaultValue,
          },
        },
        { provide: SlackService, useValue: slackService },
        { provide: getQueueToken(EMAIL_QUEUE), useValue: emailQueue },
      ],
    }).compile();

    service = module.get(NotificationDeliveryService);
  });

  it('enqueues email when tenant enabled notifications', async () => {
    settingsService.getNotifications.mockResolvedValue({
      emailEnabled: true,
      email: 'admin@company.vn',
      slackEnabled: false,
      slackWebhookUrl: null,
    });

    await service.enqueueEmailIfEnabled('tenant-1', {
      title: 'Giao dịch mới cần review',
      body: 'Test body',
      link: '/review',
    });

    expect(emailQueue.add).toHaveBeenCalledWith(
      EMAIL_SEND_JOB,
      expect.objectContaining({
        tenantId: 'tenant-1',
        to: 'admin@company.vn',
        subject: '[X-Cash AI] Giao dịch mới cần review',
        actionUrl: 'http://localhost:5173/review',
      }),
      EMAIL_JOB_OPTIONS,
    );
  });

  it('skips queue when email notifications disabled', async () => {
    settingsService.getNotifications.mockResolvedValue({
      emailEnabled: false,
      email: null,
      slackEnabled: false,
      slackWebhookUrl: null,
    });

    await service.enqueueEmailIfEnabled('tenant-1', {
      title: 'Test',
      body: 'Body',
      link: null,
    });

    expect(emailQueue.add).not.toHaveBeenCalled();
  });

  it('sends Slack message when tenant enabled Slack', async () => {
    settingsService.getNotifications.mockResolvedValue({
      emailEnabled: false,
      email: null,
      slackEnabled: true,
      slackWebhookUrl: 'https://hooks.slack.com/services/TEST',
    });

    await service.sendSlackIfEnabled('tenant-1', {
      title: 'Giao dịch mới cần review',
      body: 'Độ tin cậy 72%',
      link: '/review',
    });

    expect(slackService.send).toHaveBeenCalledWith(
      'https://hooks.slack.com/services/TEST',
      expect.objectContaining({
        title: 'Giao dịch mới cần review',
        body: 'Độ tin cậy 72%',
        actionUrl: 'http://localhost:5173/review',
      }),
    );
  });

  it('skips Slack when disabled or no webhook url', async () => {
    settingsService.getNotifications.mockResolvedValue({
      emailEnabled: false,
      email: null,
      slackEnabled: false,
      slackWebhookUrl: null,
    });

    await service.sendSlackIfEnabled('tenant-1', {
      title: 'Test',
      body: 'Body',
      link: null,
    });

    expect(slackService.send).not.toHaveBeenCalled();
  });
});
