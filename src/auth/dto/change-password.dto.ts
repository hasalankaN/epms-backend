import { IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ example: 'Password123!', description: 'Current password' })
  @IsString()
  current_password: string;

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
  new_password: string;
}
