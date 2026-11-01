import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsUUID, IsString, IsOptional } from 'class-validator';

export class CreateAccountRequestDto {
  @ApiProperty({ enum: ['ACCOUNT_CREATE', 'ACCOUNT_DEACTIVATE', 'ROLE_CHANGE'], example: 'ACCOUNT_CREATE' })
  @IsEnum(['ACCOUNT_CREATE', 'ACCOUNT_DEACTIVATE', 'ROLE_CHANGE'])
  request_type: 'ACCOUNT_CREATE' | 'ACCOUNT_DEACTIVATE' | 'ROLE_CHANGE';

  @ApiPropertyOptional({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', description: 'Target employee UUID' })
  @IsOptional() @IsUUID() target_emp_id?: string;

  @ApiProperty({ example: { email: 'new.employee@company.com', role: 'EMPLOYEE' }, description: 'Request specific data' })
  request_data: any;

  @ApiProperty({ example: 'Employee joined on 2026-12-01 and needs system access.' })
  @IsString() reason: string;
}

