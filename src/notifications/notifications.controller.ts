import { Controller, Get, Patch, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user notifications (with unread count, pagination and filter)' })
  @ApiResponse({ status: 200, description: 'Notifications list retrieved successfully' })
  async getMyNotifications(@Req() req: any, @Query() query: NotificationQueryDto) {
    const userId = req.user?.sub || req.user?.userId;
    const role = req.user?.role;
    return this.notificationsService.getForUser({ userId, role }, query);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read for current user' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllRead(@Req() req: any) {
    const userId = req.user?.sub || req.user?.userId;
    const role = req.user?.role;
    return this.notificationsService.markAllAsRead({ userId, role });
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a specific notification as read' })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }
}
