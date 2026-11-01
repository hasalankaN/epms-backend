import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsDateString, IsNumber, IsOptional, Min } from 'class-validator';

export class SubmitLeaveDto {
  @ApiProperty({ example: 'ANNUAL', description: 'ANNUAL | CASUAL | MEDICAL | SPECIAL' })
  @IsString() leave_type: string;

  @ApiProperty({ example: '2026-12-10' })
  @IsDateString() start_date: string;

  @ApiProperty({ example: '2026-12-12' })
  @IsDateString() end_date: string;

  @ApiProperty({ example: 3 })
  @IsNumber() @Min(1) days: number;

  @ApiPropertyOptional({ example: 'Family event.' })
  @IsOptional() @IsString() reason?: string;
}

