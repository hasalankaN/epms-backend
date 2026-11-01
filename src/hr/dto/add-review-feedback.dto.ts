import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class AddReviewFeedbackDto {
  @ApiProperty({ example: 'Great performance this quarter. Keep it up!' })
  @IsString() feedback: string;

  @ApiPropertyOptional({ example: 'Employee of the Month' })
  @IsOptional() @IsString() reward?: string;
}

