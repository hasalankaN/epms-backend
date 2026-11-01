import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString } from 'class-validator';

export class UpdateTaskDto {
  @ApiPropertyOptional({ example: 'Prepare Q4 Final Report' })
  @IsOptional() @IsString() title?: string;

  @ApiPropertyOptional({ example: 'Updated scope of the report.' })
  @IsOptional() @IsString() description?: string;

  @ApiPropertyOptional({ example: '2026-12-20' })
  @IsOptional() @IsDateString() due_date?: string;

  @ApiPropertyOptional({ example: 'IN_PROGRESS', description: 'PENDING | IN_PROGRESS | COMPLETED | CANCELLED' })
  @IsOptional() @IsString() status?: string;
}

