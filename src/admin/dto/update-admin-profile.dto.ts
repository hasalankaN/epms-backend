import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEmail } from 'class-validator';

export class UpdateAdminProfileDto {
  @ApiPropertyOptional({ example: 'John' })
  @IsOptional() @IsString() firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional() @IsString() lastName?: string;

  @ApiPropertyOptional({ example: 'admin@example.com' })
  @IsOptional() @IsEmail() email?: string;

  @ApiPropertyOptional({ example: '+94' })
  @IsOptional() @IsString() countryCode?: string;

  @ApiPropertyOptional({ example: '0777123456' })
  @IsOptional() @IsString() phoneNumber?: string;
}

