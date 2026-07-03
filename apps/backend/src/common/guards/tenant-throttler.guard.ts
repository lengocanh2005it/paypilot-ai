import type { ExecutionContext } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../types/authenticated-user.type';

@Injectable()
export class TenantThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Request & { user?: AuthenticatedUser }): Promise<string> {
    return req.user?.tenantId ?? req.user?.id ?? req.ip ?? 'anonymous';
  }

  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    return request.path === '/api/v1/health';
  }
}
