import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';

export class AssignTaskDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', description: 'Employee UUID' })
  @IsUUID() emp_id: string;

  @ApiProperty({ example: 'Prepare Q4 Report' })
  @IsString() @IsNotEmpty() title: string;

  @ApiPropertyOptional({ example: 'Compile all departmental KPIs into a single report.' })
  @IsOptional() @IsString() description?: string;

  @ApiPropertyOptional({ example: '2026-12-15' })
  @IsOptional() @IsDateString() due_date?: string;
}

