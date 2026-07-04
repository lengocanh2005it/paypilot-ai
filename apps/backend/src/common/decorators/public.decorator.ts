import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Đánh dấu route bỏ qua JwtAuthGuard (vd. SSE stream — EventSource không gửi được
 * Authorization header, token được verify thủ công trong service).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
