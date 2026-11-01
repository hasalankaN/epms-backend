import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';

export class ApproveProductionDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'], example: 'APPROVED' })
  @IsEnum(['APPROVED', 'REJECTED'])
  approved_status: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({ example: 'Well done, targets exceeded.' })
  @IsOptional() @IsString() supervisor_comment?: string;

  @ApiPropertyOptional({ example: 5, description: 'Rating 1–5' })
  @IsOptional() @IsNumber() @Min(1) @Max(5) rating?: number;
}

