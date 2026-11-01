import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNumber, IsString, Min } from 'class-validator';

export class CreateCompensationDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @IsUUID() emp_id: string;

  @ApiProperty({ example: 5000 })
  @IsNumber() @Min(0) amount: number;

  @ApiProperty({ example: 'Year-end performance bonus' })
  @IsString() description: string;

  @ApiProperty({ example: '2026-12', description: 'Month in YYYY-MM format' })
  @IsString() month: string;
}

