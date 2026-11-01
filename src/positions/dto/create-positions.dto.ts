import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength, IsDateString } from 'class-validator';

export class CreatePositionDto {
    @ApiPropertyOptional({
        example: 'POS-0001',
        description: 'Readable position code (auto-generated if omitted)'
    })
    @IsString()
    @IsOptional()
    @MaxLength(50)
    positionCode?: string;

    @ApiProperty({
        example: 'Senior Software Engineer',
        description: 'Position name (Max 100 characters)'
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    positionName: string;

    @ApiPropertyOptional({
        example: 'Responsible for leading backend architecture and development',
        description: 'Detailed description of the position'
    })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({
        example: '2026-01-01',
        description: 'Effective date in YYYY-MM-DD format'
    })
    @IsDateString()
    @IsOptional()
    effectiveDate?: string;
}