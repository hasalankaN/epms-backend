import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsDateString, IsNumber, IsArray } from 'class-validator';

export class CreateTrainingDto {
  @ApiProperty({ example: 'Leadership Development Program' })
  @IsString() @IsNotEmpty() title: string;

  @ApiPropertyOptional({ example: 'A 3-day workshop focused on leadership skills.' })
  @IsOptional() @IsString() description?: string;

  @ApiProperty({ example: '2026-12-01' })
  @IsDateString() start_date: string;

  @ApiProperty({ example: '2026-12-03' })
  @IsDateString() end_date: string;

  @ApiPropertyOptional({ example: 'PHYSICAL', description: 'PHYSICAL | ONLINE | HYBRID' })
  @IsOptional() @IsString() mode?: string;

  @ApiPropertyOptional({ example: 'Colombo Training Center' })
  @IsOptional() @IsString() location?: string;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional() @IsNumber() budget?: number;

  @ApiPropertyOptional({ type: [String], example: ['a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'] })
  @IsOptional() @IsArray() participant_ids?: string[];
}

