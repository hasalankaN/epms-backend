import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class SubmitPerformanceEvaluationDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', description: 'Employee UUID' })
  @IsUUID() emp_id: string;

  @ApiPropertyOptional({ example: '2026-Q4' })
  @IsOptional() @IsString() period?: string;

  @ApiPropertyOptional({ example: 'Q4' })
  @IsOptional() @IsString() quarter?: string;

  @ApiProperty({ example: 4, description: 'Rating 1–5' })
  @IsNumber() @Min(1) @Max(5) rating: number;

  @ApiProperty({ example: 'Consistently meets targets and shows leadership qualities.' })
  @IsString() comments: string;

  @ApiPropertyOptional({ example: 'COMPLETED', description: 'Final review status' })
  @IsOptional() @IsString() final_status?: string;
}

