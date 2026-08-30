import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FirebaseAuthDto {
  @ApiProperty({ 
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjFmODhiODE0MjljYzQ1MWEzMzVjMmY1Y...', 
    description: 'Firebase ID token from client SDK' 
  })
  @IsString()
  firebaseToken: string;
}

export class FirebaseSyncUserDto {
  @ApiProperty({ 
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjFmODhiODE0MjljYzQ1MWEzMzVjMmY1Y...', 
    description: 'Firebase ID token from client SDK' 
  })
  @IsString()
  firebaseToken: string;

  @ApiProperty({ example: '+1234567890', description: 'Phone number with country code', required: false })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({ example: '+1', description: 'Country code', required: false })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiProperty({ example: 'John', description: 'User first name', required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ example: 'Doe', description: 'User last name', required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ example: true, description: 'Is user a seller', required: false })
  @IsOptional()
  @IsBoolean()
  isSeller?: boolean;

  @ApiProperty({ example: true, description: 'Is user a buyer', required: false })
  @IsOptional()
  @IsBoolean()
  isBuyer?: boolean;
}
