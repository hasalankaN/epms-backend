import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RejectRequestDto {
  @ApiPropertyOptional({ example: 'Position requirements not met or duplicate documentation', description: 'Reason for rejection' })
  @IsString()
  @IsOptional()
  reason?: string;
}
