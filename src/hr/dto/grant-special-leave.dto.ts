import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNumber, IsString, IsDateString, Min } from 'class-validator';

export class GrantSpecialLeaveDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @IsUUID() emp_id: string;

  @ApiProperty({ example: 3 })
  @IsNumber() @Min(1) days: number;

  @ApiProperty({ example: 'Bereavement leave for immediate family member.' })
  @IsString() reason: string;

  @ApiProperty({ example: '2026-12-10' })
  @IsDateString() start_date: string;

  @ApiProperty({ example: '2026-12-12' })
  @IsDateString() end_date: string;
}

