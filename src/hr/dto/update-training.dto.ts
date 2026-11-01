import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsNumber, IsArray } from 'class-validator';

export class UpdateTrainingDto {
  @ApiPropertyOptional({ example: 'Advanced Leadership Program' })
  @IsOptional() @IsString() title?: string;

  @ApiPropertyOptional({ example: 'Updated description.' })
  @IsOptional() @IsString() description?: string;

  @ApiPropertyOptional({ example: '2026-12-05' })
  @IsOptional() @IsDateString() start_date?: string;

  @ApiPropertyOptional({ example: '2026-12-07' })
  @IsOptional() @IsDateString() end_date?: string;

  @ApiPropertyOptional({ example: 'ONLINE', description: 'PHYSICAL | ONLINE | HYBRID' })
  @IsOptional() @IsString() mode?: string;

  @ApiPropertyOptional({ example: 'Zoom' })
  @IsOptional() @IsString() location?: string;

  @ApiPropertyOptional({ example: 75000 })
  @IsOptional() @IsNumber() budget?: number;
}

