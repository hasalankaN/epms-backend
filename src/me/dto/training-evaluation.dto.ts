import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, Min, Max } from 'class-validator';

export class SubmitTrainingEvaluationDto {
  @ApiProperty({ example: 4, description: 'Rating 1–5' })
  @IsNumber() @Min(1) @Max(5) rating: number;

  @ApiProperty({ example: 'Very informative training. Learned a lot about leadership.' })
  @IsString() evaluation: string;
}

