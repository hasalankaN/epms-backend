import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsPhoneNumber } from 'class-validator';

export class AdminRegisterDto {
  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'plainpassword' })
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: '+94' })
  @IsOptional()
  countryCode?: string;

  @ApiProperty({ example: '0777123456' })
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({ example: 'Admin' })
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'User' })
  @IsNotEmpty()
  lastName: string;
}
