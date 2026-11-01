import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'PAYROLL_MANAGER' })
  @IsString() @IsNotEmpty() name: string;

  @ApiPropertyOptional({ example: 'Manages payroll processing and salary slips.' })
  @IsOptional() @IsString() description?: string;

  @ApiPropertyOptional({
    example: { canViewSalary: true, canEditSalary: true },
    description: 'Permissions object',
  })
  @IsOptional()
  permissions?: any;
}

