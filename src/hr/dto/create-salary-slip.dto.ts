import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateSalarySlipDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @IsUUID() emp_id: string;

  @ApiProperty({ example: '2026-12', description: 'Month YYYY-MM' })
  @IsString() month: string;

  @ApiPropertyOptional({ example: 85000 })
  @IsOptional() @IsNumber() @Min(0) basic_salary?: number;

  @ApiPropertyOptional({ example: 5000 })
  @IsOptional() @IsNumber() @Min(0) overtime_amount?: number;

  @ApiPropertyOptional({ example: 10000 })
  @IsOptional() @IsNumber() @Min(0) bonus_amount?: number;
}

