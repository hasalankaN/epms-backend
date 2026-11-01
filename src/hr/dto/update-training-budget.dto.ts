import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class UpdateTrainingBudgetDto {
  @ApiProperty({ example: 75000 })
  @IsNumber() budget: number;

  @ApiProperty({ example: 'APPROVED', description: 'PENDING | APPROVED | REJECTED' })
  @IsString() budget_status: string;
}

