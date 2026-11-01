import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional } from 'class-validator';

export class NotifyAttendanceDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @IsUUID()
  empId: string;

  @ApiProperty({ example: 'You have been absent for 3 consecutive days.' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ example: 'Attendance Warning' })
  @IsOptional() @IsString() title?: string;
}

