import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, IsDateString } from 'class-validator';

export class UpdateVacancyDto {
  @ApiPropertyOptional({ example: 'Senior Software Engineer' })
  @IsOptional() @IsString() title?: string;

  @ApiPropertyOptional({ example: 'Updated job description...' })
  @IsOptional() @IsString() description?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional() @IsInt() @Min(1) openings?: number;

  @ApiPropertyOptional({ example: '2027-01-31' })
  @IsOptional() @IsDateString() closing_date?: string;

  @ApiPropertyOptional({ example: 'OPEN', description: 'OPEN | CLOSED | FILLED' })
  @IsOptional() @IsString() status?: string;
}

