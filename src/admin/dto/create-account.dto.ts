import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional } from 'class-validator';
import { UserRole } from '../../common/enums/roles.enum';

export class CreateAccountDto {
  @ApiPropertyOptional({ example: 'kamal.silva' })
  @IsOptional() @IsString() username?: string;

  @ApiProperty({ example: 'kamal.silva@company.com' })
  @IsEmail() email: string;

  @ApiProperty({ enum: UserRole, example: UserRole.EMPLOYEE })
  @IsString() role: string;

  @ApiPropertyOptional({ example: 'Kamal' })
  @IsOptional() @IsString() first_name?: string;

  @ApiPropertyOptional({ example: 'Silva' })
  @IsOptional() @IsString() last_name?: string;
}

