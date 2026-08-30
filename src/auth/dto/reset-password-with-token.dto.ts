import { IsEmail, IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordWithTokenDto {
  @ApiProperty({ example: 'john.doe@example.com', description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ 
    example: 'abc123def456ghi789jkl', 
    description: 'Reset token received after OTP validation' 
  })
  @IsString()
  resetToken: string;

  @ApiProperty({ 
    example: 'NewPassword123!', 
    description: 'New password (min 8 chars, must contain uppercase, lowercase, number and special character)' 
  })
  @IsString()
  @MinLength(8)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?`~]).+$/,
    {
      message: 'Password must contain uppercase, lowercase, number and special character',
    },
  )
  newPassword: string;
}
