import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsDateString, IsOptional, IsString, Min } from 'class-validator';

export class UpdateSalaryDto {
  @ApiProperty({ example: 85000, description: 'New basic salary amount' })
  @IsNumber() @Min(0) basic_salary: number;

  @ApiProperty({ example: '2026-12-01', description: 'Effective date YYYY-MM-DD' })
  @IsDateString() effective_date: string;

  @ApiPropertyOptional({ example: 'Annual increment' })
  @IsOptional() @IsString() reason?: string;
}

