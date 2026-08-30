import { IsEmail, IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'john.doe@example.com', description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123!', description: 'User password' })
  @IsString()
  password: string;

  @ApiProperty({ example: false, description: 'Remember me for extended session', required: false })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;

  @ApiProperty({ example: 'fcm_token_12345', description: 'Device push token', required: false })
  @IsOptional()
  @IsString()
  deviceToken?: string;

  @ApiProperty({ example: 'device-uuid-1234', description: 'Device unique id', required: false })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({ example: 'android', description: 'Device type (android|ios|web)', required: false })
  @IsOptional()
  @IsString()
  deviceType?: string;

  @ApiProperty({ example: '1.3.0', description: 'Application version', required: false })
  @IsOptional()
  @IsString()
  appVersion?: string;

  @ApiProperty({ example: 'Asia/Colombo', description: 'User time zone', required: false })
  @IsOptional()
  @IsString()
  timeZone?: string;
}
