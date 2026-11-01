import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsString, IsOptional, IsDateString } from 'class-validator';

export class AttendanceAdjustmentDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', description: 'Attendance record UUID' })
  @IsUUID() attendance_id: string;

  @ApiPropertyOptional({ example: '2026-11-01T08:00:00Z', description: 'Corrected punch-in time ISO 8601' })
  @IsOptional() @IsDateString() new_punch_in?: string;

  @ApiPropertyOptional({ example: '2026-11-01T17:00:00Z', description: 'Corrected punch-out time ISO 8601' })
  @IsOptional() @IsDateString() new_punch_out?: string;

  @ApiProperty({ example: 'System recorded wrong time due to power outage.' })
  @IsString() reason: string;
}

