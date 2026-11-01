import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail, IsDateString, IsOptional, IsUUID } from 'class-validator';

export class CreateEmployeeDto {
  @ApiProperty({ example: 'Kamal' })
  @IsString() @IsNotEmpty() first_name: string;

  @ApiProperty({ example: 'Silva' })
  @IsString() @IsNotEmpty() last_name: string;

  @ApiProperty({ example: '1995-08-20' })
  @IsDateString() dob: string;

  @ApiProperty({ example: '2024-01-15' })
  @IsDateString() join_date: string;

  @ApiProperty({ example: 'EPF-10294' })
  @IsString() @IsNotEmpty() epf_no: string;

  @ApiProperty({ example: 'kamal.silva@company.com' })
  @IsEmail() work_email: string;

  @ApiPropertyOptional({ example: '+94712345678' })
  @IsOptional() @IsString() mobile_no?: string;

  @ApiPropertyOptional({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', description: 'Department UUID' })
  @IsOptional() @IsUUID() department_id?: string;

  @ApiPropertyOptional({ example: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', description: 'Position UUID' })
  @IsOptional() @IsUUID() position_id?: string;
}

