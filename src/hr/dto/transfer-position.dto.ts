import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsString, IsDateString } from 'class-validator';

export class TransferPositionDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', description: 'Employee UUID' })
  @IsUUID() emp_id: string;

  @ApiProperty({ example: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', description: 'New position UUID' })
  @IsUUID() new_position_id: string;

  @ApiPropertyOptional({ example: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', description: 'New department UUID' })
  @IsOptional() @IsUUID() new_dept_id?: string;

  @ApiPropertyOptional({ example: '2026-12-01' })
  @IsOptional() @IsDateString() start_date?: string;

  @ApiPropertyOptional({ example: 'Departmental restructure' })
  @IsOptional() @IsString() reason?: string;
}

