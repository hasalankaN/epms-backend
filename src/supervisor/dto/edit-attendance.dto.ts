import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsString } from 'class-validator';

export class EditAttendanceDto {
  @ApiPropertyOptional({ example: '2026-11-01T08:05:00Z' })
  @IsOptional() @IsDateString() punch_in?: string;

  @ApiPropertyOptional({ example: '2026-11-01T17:00:00Z' })
  @IsOptional() @IsDateString() punch_out?: string;

  @ApiPropertyOptional({ example: 'Correcting wrong clock-in time.' })
  @IsOptional() @IsString() reason?: string;
}

