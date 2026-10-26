import { Injectable, Inject, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, or, and, count, desc, SQL } from 'drizzle-orm';
import * as schema from '../database/schema';
import { DATABASE_CONNECTION } from '../database/database.module';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(dto: CreateNotificationDto) {
    try {
      const [notification] = await this.db
        .insert(schema.notifications)
        .values({
          recipient_id: dto.recipient_id || null,
          recipient_role: dto.recipient_role ? dto.recipient_role.toLowerCase() : null,
          title: dto.title,
          message: dto.message,
          type: dto.type,
          data: dto.data || null,
          is_read: false,
        })
        .returning();

      return notification;
    } catch (err) {
      console.error('[NotificationsService][create] DB error:', err);
      throw new InternalServerErrorException('Failed to create notification');
    }
  }

  async getForUser(user: { userId: string; role?: string }, query: NotificationQueryDto) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 10;
    const offset = (page - 1) * pageSize;

    const userRole = (user.role || '').toLowerCase();

    try {
      const recipientConditions: SQL[] = [];
      if (user.userId) {
        recipientConditions.push(eq(schema.notifications.recipient_id, user.userId));
      }
      if (userRole) {
        recipientConditions.push(eq(schema.notifications.recipient_role, userRole));
      }

      const baseRecipientCondition =
        recipientConditions.length > 0 ? or(...recipientConditions)! : undefined;

      const filterConditions: SQL[] = [];
      if (baseRecipientCondition) {
        filterConditions.push(baseRecipientCondition);
      }

      if (query.unreadOnly) {
        filterConditions.push(eq(schema.notifications.is_read, false));
      }

      if (query.type) {
        filterConditions.push(eq(schema.notifications.type, query.type));
      }

      const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;

      const [{ totalCount }] = await this.db
        .select({ totalCount: count() })
        .from(schema.notifications)
        .where(whereClause);

      // Also get total unread count for badge
      const unreadWhere = baseRecipientCondition
        ? and(baseRecipientCondition, eq(schema.notifications.is_read, false))
        : eq(schema.notifications.is_read, false);

      const [{ unreadCount }] = await this.db
        .select({ unreadCount: count() })
        .from(schema.notifications)
        .where(unreadWhere);

      const total = Number(totalCount) || 0;

      const data = await this.db
        .select()
        .from(schema.notifications)
        .where(whereClause)
        .orderBy(desc(schema.notifications.created_at))
        .limit(pageSize)
        .offset(offset);

      return {
        data,
        meta: {
          total,
          unreadCount: Number(unreadCount) || 0,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (err) {
      console.error('[NotificationsService][getForUser] DB error:', err);
      throw new InternalServerErrorException('Failed to retrieve notifications');
    }
  }

  async markAsRead(notificationId: string) {
    try {
      const [updated] = await this.db
        .update(schema.notifications)
        .set({ is_read: true })
        .where(eq(schema.notifications.id, notificationId))
        .returning();

      if (!updated) {
        throw new NotFoundException('Notification not found');
      }

      return {
        message: 'Notification marked as read',
        data: updated,
      };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      console.error('[NotificationsService][markAsRead] DB error:', err);
      throw new InternalServerErrorException('Failed to mark notification as read');
    }
  }

  async markAllAsRead(user: { userId: string; role?: string }) {
    const userRole = (user.role || '').toLowerCase();
    try {
      const recipientConditions: SQL[] = [];
      if (user.userId) {
        recipientConditions.push(eq(schema.notifications.recipient_id, user.userId));
      }
      if (userRole) {
        recipientConditions.push(eq(schema.notifications.recipient_role, userRole));
      }

      const whereClause =
        recipientConditions.length > 0 ? or(...recipientConditions) : undefined;

      await this.db
        .update(schema.notifications)
        .set({ is_read: true })
        .where(whereClause);

      return {
        message: 'All notifications marked as read',
      };
    } catch (err) {
      console.error('[NotificationsService][markAllAsRead] DB error:', err);
      throw new InternalServerErrorException('Failed to mark all notifications as read');
    }
  }
}
