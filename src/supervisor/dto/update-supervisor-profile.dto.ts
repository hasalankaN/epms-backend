import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateSupervisorProfileDto {
  @ApiPropertyOptional({ example: 'Nimal' })
  @IsOptional() @IsString() first_name?: string;

  @ApiPropertyOptional({ example: 'Perera' })
  @IsOptional() @IsString() last_name?: string;

  @ApiPropertyOptional({ example: '+94712345678' })
  @IsOptional() @IsString() mobile_no?: string;

  @ApiPropertyOptional({ example: 'Colombo 3' })
  @IsOptional() @IsString() city?: string;
}

