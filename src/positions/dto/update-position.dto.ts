import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, IsDateString } from 'class-validator';

// Used for PATCH - all fields are optional
export class UpdatePositionDto {
    @ApiPropertyOptional({ example: 'Senior Software Engineer', description: 'Position name' })
    @IsString()
    @IsOptional()
    @MaxLength(100)
    positionName?: string;

    @ApiPropertyOptional({ example: 'Leads backend architecture', description: 'Description' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ example: '2026-06-01', description: 'Effective date YYYY-MM-DD' })
    @IsDateString()
    @IsOptional()
    effectiveDate?: string;
}
