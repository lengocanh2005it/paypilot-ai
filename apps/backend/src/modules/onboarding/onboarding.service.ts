import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CasClientService } from '../cas/cas-client.service';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly casClient: CasClientService,
    private readonly configService: ConfigService,
  ) {}

  async createGrantToken(scopes = 'qrpay') {
    const redirectUri = this.configService.get<string>(
      'CAS_GRANT_REDIRECT_URI',
      'http://localhost:5173/onboarding/callback',
    );

    const result = await this.casClient.createGrantToken({
      scopes,
      redirectUri,
      language: 'vi',
    });

    return {
      grantToken: result.grantToken,
      expiresAt: result.expiresAt ?? null,
      redirectUri,
    };
  }

  async handleBankingCallback(tenantId: string, publicToken: string) {
    const exchange = await this.casClient.exchangeGrant(publicToken);
    const identity = await this.casClient.getIdentity(exchange.accessToken);
    const { accountNumber, bankName } = this.casClient.parseIdentity(identity);

    const existingGrant = await this.prisma.casGrant.findUnique({
      where: { grantId: exchange.grantId },
    });

    if (existingGrant && existingGrant.tenantId !== tenantId) {
      throw new ConflictException('Grant đã được liên kết với tenant khác');
    }

    const grant = await this.prisma.casGrant.upsert({
      where: { grantId: exchange.grantId },
      create: {
        tenantId,
        grantId: exchange.grantId,
        accessToken: exchange.accessToken,
        accountNumber,
        bankName,
        status: 'active',
      },
      update: {
        accessToken: exchange.accessToken,
        accountNumber,
        bankName,
        status: 'active',
        linkedAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        entityType: 'cas_grant',
        entityId: grant.id,
        action: 'banking_linked',
        actor: tenantId,
        afterState: {
          grantId: grant.grantId,
          accountNumber: grant.accountNumber,
          bankName: grant.bankName,
        },
      },
    });

    return {
      grantId: grant.grantId,
      accountNumber: grant.accountNumber,
      bankName: grant.bankName,
      linkedAt: grant.linkedAt.toISOString(),
    };
  }

  async getStatus(tenantId: string) {
    const grants = await this.prisma.casGrant.findMany({
      where: { tenantId, status: 'active' },
      orderBy: { linkedAt: 'desc' },
      select: {
        id: true,
        grantId: true,
        accountNumber: true,
        bankName: true,
        linkedAt: true,
        status: true,
      },
    });

    const bankingLinked = grants.length > 0;

    return {
      currentStep: bankingLinked ? 3 : 2,
      bankingLinked,
      grants,
      steps: [
        { id: 'register', label: 'Đăng ký tài khoản', completed: true },
        { id: 'banking', label: 'Liên kết ngân hàng', completed: bankingLinked },
        { id: 'ready', label: 'Sẵn sàng nhận giao dịch', completed: bankingLinked },
      ],
    };
  }
}
