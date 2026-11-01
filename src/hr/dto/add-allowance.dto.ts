import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, Min } from 'class-validator';

export class AddAllowanceDto {
  @ApiProperty({ example: 'Transport allowance' })
  @IsString() description: string;

  @ApiProperty({ example: 3000 })
  @IsNumber() @Min(0) amount: number;
}

