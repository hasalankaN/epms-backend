import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateInterviewDto {
  @ApiPropertyOptional({ example: '2026-12-16T14:00:00Z' })
  @IsOptional() @IsDateString() interview_date?: string;

  @ApiPropertyOptional({ example: 'Interview rescheduled.' })
  @IsOptional() @IsString() notes?: string;

  @ApiPropertyOptional({ example: 'PASSED', description: 'PENDING | PASSED | FAILED | CANCELLED' })
  @IsOptional() @IsString() status?: string;
}

