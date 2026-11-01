import { IsOptional, IsInt, Min, IsString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class EmployeeQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  pageSize?: number = 10;

  @ApiPropertyOptional({ example: 'Kamal', description: 'Search by employee name, EPF no, email, department, or position' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', description: 'Filter by department ID' })
  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({ example: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', description: 'Filter by position ID' })
  @IsUUID()
  @IsOptional()
  positionId?: string;

  @ApiPropertyOptional({ example: 'Active', description: 'Filter by user account status (e.g. Active, Inactive)' })
  @IsString()
  @IsOptional()
  status?: string;
}
