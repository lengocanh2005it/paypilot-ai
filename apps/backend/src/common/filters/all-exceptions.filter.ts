import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ApiResponse } from '@xcash/shared-types';
import type { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId?: string }>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const { message, code } =
      exception instanceof HttpException
        ? this.extractError(exception)
        : { message: 'Đã xảy ra lỗi hệ thống', code: undefined };

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ApiResponse<null> = {
      success: false,
      data: null,
      meta: {
        timestamp: new Date().toISOString(),
        request_id: request.requestId ?? 'unknown',
      },
      error: {
        code: code ?? HttpStatus[status] ?? 'INTERNAL_SERVER_ERROR',
        message,
      },
    };

    response.status(status).json(body);
  }

  private extractError(exception: HttpException): { message: string; code?: string } {
    const response = exception.getResponse();
    if (typeof response === 'string') {
      return { message: response };
    }
    if (typeof response === 'object' && response !== null) {
      const obj = response as { message?: string | string[]; code?: string };
      const message = Array.isArray(obj.message)
        ? obj.message.join(', ')
        : (obj.message ?? exception.message);
      return { message, code: obj.code };
    }
    return { message: exception.message };
  }
}
