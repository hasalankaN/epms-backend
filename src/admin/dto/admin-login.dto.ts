import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class AdminLoginDto {
  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'plainpassword' })
  @IsNotEmpty()
  password: string;

  @ApiProperty({ required: false, example: false })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
