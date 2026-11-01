import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsDateString } from 'class-validator';

export class CreateVacancyDto {
  @ApiProperty({ example: 'Senior Software Engineer' })
  @IsString() @IsNotEmpty() title: string;

  @ApiPropertyOptional({ example: 'We are looking for an experienced backend engineer...' })
  @IsOptional() @IsString() description?: string;

  @ApiPropertyOptional({ example: 3, description: 'Number of open positions' })
  @IsOptional() @IsInt() @Min(1) openings?: number;

  @ApiPropertyOptional({ example: '2026-12-31', description: 'Application closing date' })
  @IsOptional() @IsDateString() closing_date?: string;

  @ApiPropertyOptional({ example: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', description: 'Position UUID' })
  @IsOptional() @IsString() position_id?: string;

  @ApiPropertyOptional({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', description: 'Department UUID' })
  @IsOptional() @IsString() department_id?: string;
}

