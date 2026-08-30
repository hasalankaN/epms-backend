import { IsEmail, IsString, MinLength, Matches, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'John', description: 'User first name' })
  @IsString()
  @MinLength(2)
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'User last name' })
  @IsString()
  @MinLength(2)
  lastName: string;

  @ApiProperty({ example: 'john.doe@example.com', description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ 
    example: 'Password123!', 
    description: 'Password (min 8 chars, must contain uppercase, lowercase, number and special character)' 
  })
  @IsString()
  @MinLength(8)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?`~]).+$/,
    {
      message: 'Password must contain uppercase, lowercase, number and special character',
    },
  )
  password: string;

  @ApiProperty({ example: '+1234567890', description: 'Phone number with country code', required: false })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({ example: '+1', description: 'Country code', required: false })
  @IsOptional()
  @IsString()
  countryCode?: string;
}
