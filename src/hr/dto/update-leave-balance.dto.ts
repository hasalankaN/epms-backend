import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, Min } from 'class-validator';

export class UpdateLeaveBalanceDto {
  @ApiProperty({ example: 'ANNUAL', description: 'ANNUAL | CASUAL | MEDICAL | SPECIAL' })
  @IsString() leave_type: string;

  @ApiProperty({ example: 2026 })
  @IsNumber() year: number;

  @ApiProperty({ example: 14 })
  @IsNumber() @Min(0) balance: number;
}

