import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNumber, IsString, Min } from 'class-validator';

export class CreateBonusDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @IsUUID() emp_id: string;

  @ApiProperty({ example: 'Performance bonus Q4' })
  @IsString() description: string;

  @ApiProperty({ example: 10000 })
  @IsNumber() @Min(0) amount: number;

  @ApiProperty({ example: '2026-12', description: 'Month YYYY-MM' })
  @IsString() month: string;
}

