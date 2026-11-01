import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUUID, IsEnum } from 'class-validator';

export enum NotificationTarget {
  ALL = 'ALL',
  SPECIFIC = 'SPECIFIC',
}

export class CreateNotificationDto {
  @ApiProperty({ example: 'System Maintenance' })
  @IsString() @IsNotEmpty() title: string;

  @ApiProperty({ example: 'The system will be down for maintenance on Sunday from 2am to 4am.' })
  @IsString() @IsNotEmpty() message: string;

  @ApiPropertyOptional({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', description: 'Target employee UUID (if specific)' })
  @IsOptional() @IsUUID() emp_id?: string;

  @ApiPropertyOptional({ example: 'ALL', description: 'ALL | SPECIFIC', enum: NotificationTarget })
  @IsOptional() @IsEnum(NotificationTarget) target?: NotificationTarget;
}

