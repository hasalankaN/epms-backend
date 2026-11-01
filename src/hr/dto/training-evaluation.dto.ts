import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsNumber, Min, Max } from 'class-validator';

export class TrainingEvaluationDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @IsUUID() emp_id: string;

  @ApiProperty({ example: 4, description: 'Rating 1–5' })
  @IsNumber() @Min(1) @Max(5) rating: number;

  @ApiProperty({ example: 'Employee demonstrated excellent participation.' })
  @IsString() evaluation: string;
}

