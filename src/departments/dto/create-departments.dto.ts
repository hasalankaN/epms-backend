import { IsEmail, IsString, MinLength, Matches, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDepartmentDto {
    @ApiProperty({ example: 'Marketing', description: 'Department name' })
    @IsString()
    @MinLength(2)
    departmentName: string;

    @ApiProperty({ example: 'Doe', description: 'Location' })
    @IsString()
    @MinLength(2)
    location: string;

    @ApiProperty({ example: '1', description: 'Department Phone' })
    @IsString()
    deptPhone: string;
}
