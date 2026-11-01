import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, IsBoolean, Min } from 'class-validator';

export class UpdateLeavePolicyDto {
  @ApiPropertyOptional({ example: 14, description: 'Total entitlement days per year' })
  @IsOptional() @IsNumber() @Min(0) entitlement_days?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean() carry_forward?: boolean;

  @ApiPropertyOptional({ example: 5, description: 'Maximum carry forward days' })
  @IsOptional() @IsNumber() @Min(0) max_carry_forward_days?: number;

  @ApiPropertyOptional({ example: 'Accrued monthly', description: 'Notes or policy description' })
  @IsOptional() @IsString() description?: string;
}

