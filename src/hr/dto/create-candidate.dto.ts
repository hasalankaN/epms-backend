import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail, IsOptional } from 'class-validator';

export class CreateCandidateDto {
  @ApiProperty({ example: 'Ashan Fernando' })
  @IsString() @IsNotEmpty() full_name: string;

  @ApiProperty({ example: 'ashan.fernando@gmail.com' })
  @IsEmail() email: string;

  @ApiPropertyOptional({ example: '+94771234567' })
  @IsOptional() @IsString() phone?: string;

  @ApiPropertyOptional({ example: 'https://storage.company.com/resumes/ashan_cv.pdf' })
  @IsOptional() @IsString() resume_url?: string;
}

