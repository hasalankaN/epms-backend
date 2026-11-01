import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateInterviewDto {
  @ApiPropertyOptional({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', description: 'Internal job application UUID' })
  @IsOptional() @IsUUID() application_id?: string;

  @ApiPropertyOptional({ example: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', description: 'External candidate UUID' })
  @IsOptional() @IsUUID() candidate_id?: string;

  @ApiPropertyOptional({ example: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', description: 'Interviewer employee UUID' })
  @IsOptional() @IsUUID() interview_by?: string;

  @ApiProperty({ example: '2026-12-15T10:00:00Z', description: 'Interview date/time ISO 8601' })
  @IsDateString() interview_date: string;

  @ApiPropertyOptional({ example: 'Please bring your portfolio.' })
  @IsOptional() @IsString() notes?: string;
}

