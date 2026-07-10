import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import type {
  EmailChangePasswordOtpJobData,
  EmailInviteJobData,
  EmailJobData,
  EmailMonthlyReportJobData,
  EmailOtpJobData,
  EmailResetOtpJobData,
} from './email.constants';
import {
  buildChangePasswordOtpHtml,
  buildChangePasswordOtpText,
  buildGenericHtml,
  buildGenericText,
  buildMonthlyReportHtml,
  buildMonthlyReportText,
  buildPasswordResetOtpHtml,
  buildPasswordResetOtpText,
  buildTeamInviteHtml,
  buildTeamInviteText,
  buildVerificationOtpHtml,
  buildVerificationOtpText,
} from './email-templates';

@Injectable()
export class ResendEmailService {
  private readonly logger = new Logger(ResendEmailService.name);
  private readonly client: Resend | null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY', '');
    this.client = apiKey ? new Resend(apiKey) : null;
  }

  private getFrom(): string {
    const senderName = this.configService.get<string>('RESEND_SENDER_NAME', 'X-Cash AI');
    const senderEmail = this.configService.get<string>('RESEND_SENDER_EMAIL', 'noreply@xcash.ai');
    return `${senderName} <${senderEmail}>`;
  }

  private async sendEmail(
    to: string,
    subject: string,
    html: string,
    text: string,
    logContext: string,
  ): Promise<void> {
    if (!this.client) {
      this.logger.warn(`RESEND_API_KEY chưa cấu hình — bỏ qua gửi email ${logContext}`);
      return;
    }

    const result = await this.client.emails.send({
      from: this.getFrom(),
      to,
      subject,
      html,
      text,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    this.logger.log(`Email sent to ${to} (${logContext})`);
  }

  async send(data: EmailJobData): Promise<void> {
    await this.sendEmail(
      data.to,
      data.subject,
      buildGenericHtml(data),
      buildGenericText(data),
      `tenant ${data.tenantId}`,
    );
  }

  async sendVerificationOtp(data: EmailOtpJobData): Promise<void> {
    await this.sendEmail(
      data.to,
      `[X-Cash AI] Mã xác thực email của bạn`,
      buildVerificationOtpHtml(data),
      buildVerificationOtpText(data),
      'verification OTP',
    );
  }

  async sendPasswordResetOtp(data: EmailResetOtpJobData): Promise<void> {
    await this.sendEmail(
      data.to,
      `[X-Cash AI] Mã đặt lại mật khẩu`,
      buildPasswordResetOtpHtml(data),
      buildPasswordResetOtpText(data),
      'password reset OTP',
    );
  }

  async sendChangePasswordOtp(data: EmailChangePasswordOtpJobData): Promise<void> {
    await this.sendEmail(
      data.to,
      `[X-Cash AI] Mã xác thực đổi mật khẩu`,
      buildChangePasswordOtpHtml(data),
      buildChangePasswordOtpText(data),
      'change password OTP',
    );
  }

  async sendTeamInvite(data: EmailInviteJobData): Promise<void> {
    await this.sendEmail(
      data.to,
      `[X-Cash AI] Lời mời tham gia ${data.businessName}`,
      buildTeamInviteHtml(data),
      buildTeamInviteText(data),
      'team invite',
    );
  }

  async sendMonthlyReport(data: EmailMonthlyReportJobData): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const dashboardUrl = `${frontendUrl.replace(/\/$/, '')}/reports`;
    const monthLabel = `Tháng ${data.month}/${data.year}`;

    await this.sendEmail(
      data.to,
      `[X-Cash AI] Báo cáo ${monthLabel} — ${data.businessName}`,
      buildMonthlyReportHtml(data, dashboardUrl),
      buildMonthlyReportText(data, dashboardUrl),
      `monthly report tenant ${data.tenantId}`,
    );
  }
}
