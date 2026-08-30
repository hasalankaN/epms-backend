import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AdminUpdatePasswordDto {
  @ApiProperty({ example: 'newSecurePassword123' })
  @IsNotEmpty()
  @IsString()
  newPassword: string;
}
