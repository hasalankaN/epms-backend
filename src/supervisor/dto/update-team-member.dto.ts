import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateTeamMemberDto {
  @ApiPropertyOptional({ example: 'Kamal' })
  @IsOptional() @IsString() first_name?: string;

  @ApiPropertyOptional({ example: 'Silva' })
  @IsOptional() @IsString() last_name?: string;

  @ApiPropertyOptional({ example: '+94712345678' })
  @IsOptional() @IsString() mobile_no?: string;

  @ApiPropertyOptional({ example: '123, Main Street' })
  @IsOptional() @IsString() street?: string;

  @ApiPropertyOptional({ example: 'Colombo' })
  @IsOptional() @IsString() city?: string;
}

