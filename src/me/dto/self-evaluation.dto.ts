import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, Min, Max } from 'class-validator';

export class SubmitSelfEvaluationDto {
  @ApiProperty({ example: '2026-Q4', description: 'Evaluation period' })
  @IsString() period: string;

  @ApiProperty({ example: 'I have met all my targets and improved my technical skills significantly.' })
  @IsString() employee_review: string;

  @ApiProperty({ example: 4, description: 'Self rating 1–5' })
  @IsNumber() @Min(1) @Max(5) self_rating: number;
}

