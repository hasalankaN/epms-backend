import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResendOtpDto {
  @ApiProperty({ example: 'john.doe@example.com', description: 'User email address to resend OTP' })
  @IsEmail()
  email: string;
}
