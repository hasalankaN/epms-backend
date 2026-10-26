import { IsString, IsNotEmpty, IsOptional, IsUUID, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiPropertyOptional({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', description: 'Specific recipient user ID' })
  @IsUUID()
  @IsOptional()
  recipient_id?: string;

  @ApiPropertyOptional({ example: 'admin', description: 'Recipient role for broadcast notifications' })
  @IsString()
  @IsOptional()
  recipient_role?: string;

  @ApiProperty({ example: 'New Employee Account Request' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'HR submitted an employee account request for Kamal Silva' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ example: 'EMPLOYEE_ACCOUNT_REQUEST' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiPropertyOptional({ example: { requestId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' } })
  @IsOptional()
  data?: any;
}
