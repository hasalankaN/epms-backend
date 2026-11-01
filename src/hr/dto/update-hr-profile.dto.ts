import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateHrProfileDto {
  @ApiPropertyOptional({ example: 'Nimal' })
  @IsOptional() @IsString() first_name?: string;

  @ApiPropertyOptional({ example: 'Perera' })
  @IsOptional() @IsString() last_name?: string;

  @ApiPropertyOptional({ example: '+94712345678' })
  @IsOptional() @IsString() mobile_no?: string;

  @ApiPropertyOptional({ example: '10, Temple Road' })
  @IsOptional() @IsString() street?: string;

  @ApiPropertyOptional({ example: 'Kandy' })
  @IsOptional() @IsString() city?: string;

  @ApiPropertyOptional({ example: 'Central' })
  @IsOptional() @IsString() province?: string;

  @ApiPropertyOptional({ example: 'Sri Lanka' })
  @IsOptional() @IsString() country?: string;
}

