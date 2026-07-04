import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  MessageEvent,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Observable } from 'rxjs';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard, RolesGuard } from '../../common/guards/auth.guards';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { DeleteNotificationsDto } from './dto/delete-notifications.dto';
import { NotificationService } from './notification.service';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  // Public — EventSource không gửi được Authorization header
  // Token được verify thủ công bên trong service
  @Public()
  @Sse('stream')
  stream(@Query('token') token: string): Observable<MessageEvent> {
    return this.service.streamForToken(token) as Observable<MessageEvent>;
  }

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.service.list(user.tenantId!, user.id, page, Math.min(limit, 50));
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getUnreadCount(user.tenantId!, user.id);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.service.markAllRead(user.tenantId!, user.id);
  }

  @Patch(':id/read')
  markRead(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.markRead(user.tenantId!, user.id, id);
  }

  @Delete('all')
  removeAll(@CurrentUser() user: AuthenticatedUser) {
    return this.service.removeAll(user.tenantId!, user.id);
  }

  @Delete()
  removeMany(@CurrentUser() user: AuthenticatedUser, @Body() dto: DeleteNotificationsDto) {
    return this.service.removeMany(user.tenantId!, user.id, dto.ids);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user.tenantId!, user.id, id);
  }
}
