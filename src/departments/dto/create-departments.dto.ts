import { IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDepartmentDto {
    @ApiPropertyOptional({ example: 'DEP-0001', description: 'Custom readable department code (auto-generated if omitted)' })
    @IsString()
    @IsOptional()
    departmentCode?: string;

    @ApiProperty({ example: 'Marketing', description: 'Department name' })
    @IsString()
    @MinLength(2)
    departmentName: string;

    @ApiProperty({ example: 'Colombo Office, Level 4', description: 'Location' })
    @IsString()
    @MinLength(2)
    location: string;

    @ApiProperty({ example: '+94112345678', description: 'Department Phone' })
    @IsString()
    deptPhone: string;
}
