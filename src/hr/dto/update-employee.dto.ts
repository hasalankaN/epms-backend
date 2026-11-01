import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsUUID } from 'class-validator';

export class UpdateEmployeeDto {
  @ApiPropertyOptional({ example: 'Kamal' })
  @IsOptional() @IsString() first_name?: string;

  @ApiPropertyOptional({ example: 'Silva' })
  @IsOptional() @IsString() last_name?: string;

  @ApiPropertyOptional({ example: '+94712345678' })
  @IsOptional() @IsString() mobile_no?: string;

  @ApiPropertyOptional({ example: 'kamal.personal@gmail.com' })
  @IsOptional() @IsEmail() personal_email?: string;

  @ApiPropertyOptional({ example: '123, Main Street' })
  @IsOptional() @IsString() street?: string;

  @ApiPropertyOptional({ example: 'Colombo' })
  @IsOptional() @IsString() city?: string;

  @ApiPropertyOptional({ example: 'Western' })
  @IsOptional() @IsString() province?: string;

  @ApiPropertyOptional({ example: 'Sri Lanka' })
  @IsOptional() @IsString() country?: string;

  @ApiPropertyOptional({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', description: 'Department UUID' })
  @IsOptional() @IsUUID() department_id?: string;

  @ApiPropertyOptional({ example: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', description: 'Position UUID' })
  @IsOptional() @IsUUID() position_id?: string;
}

