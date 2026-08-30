import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class SendPasswordOtpDto {
  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail()
  email: string;
}
