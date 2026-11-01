import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsDateString, IsOptional, IsString } from 'class-validator';

export class ScheduleEvaluationMeetingDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', description: 'Employee UUID' })
  @IsUUID() emp_id: string;

  @ApiProperty({ example: '2026-12-20T09:00:00Z', description: 'Meeting scheduled datetime ISO 8601' })
  @IsDateString() scheduled_at: string;

  @ApiPropertyOptional({ example: 'Board Room 2, HQ' })
  @IsOptional() @IsString() location?: string;

  @ApiPropertyOptional({ example: 'Annual performance review meeting.' })
  @IsOptional() @IsString() notes?: string;
}

