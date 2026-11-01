import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, Min } from 'class-validator';

export class AddDeductionDto {
  @ApiProperty({ example: 'Loan repayment' })
  @IsString() description: string;

  @ApiProperty({ example: 2000 })
  @IsNumber() @Min(0) amount: number;
}

