import type { ApiResponse } from '@xcash/shared-types';
import axios from 'axios';

export function getErrorMessage(
  error: unknown,
  fallback = 'Có lỗi xảy ra, vui lòng thử lại',
): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiResponse<unknown> | undefined;
    if (data?.error?.message) {
      return data.error.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export function isEmailNotVerifiedError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false;
  }
  const data = error.response?.data as ApiResponse<unknown> | undefined;
  return data?.error?.code === 'EMAIL_NOT_VERIFIED';
}
