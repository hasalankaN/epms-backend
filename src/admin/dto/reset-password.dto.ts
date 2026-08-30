import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'a1b2c3d4e5f6...' , description: 'Reset token returned from confirm-otp' })
  @IsNotEmpty()
  @IsString()
  resetToken: string;

  @ApiProperty({ example: 'newSecurePassword123' })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  newPassword: string;
}
