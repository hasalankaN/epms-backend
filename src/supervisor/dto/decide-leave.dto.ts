import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsBoolean } from 'class-validator';

export class SupervisorDecideLeaveDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED', 'ESCALATED'], example: 'APPROVED' })
  @IsEnum(['APPROVED', 'REJECTED', 'ESCALATED'])
  decision: 'APPROVED' | 'REJECTED' | 'ESCALATED';

  @ApiPropertyOptional({ example: 'Approved. Team coverage confirmed.' })
  @IsOptional() @IsString() comment?: string;

  @ApiPropertyOptional({ example: false, description: 'Set true to escalate to HR' })
  @IsOptional() @IsBoolean() escalate?: boolean;
}

