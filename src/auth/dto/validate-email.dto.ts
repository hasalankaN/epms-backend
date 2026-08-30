import { IsEmail, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateEmailDto {
  @ApiProperty({ example: 'john.doe@example.com', description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '1234', description: '4-digit OTP code sent to email' })
  @IsString()
  @Length(4, 4)
  otpCode: string;
}
