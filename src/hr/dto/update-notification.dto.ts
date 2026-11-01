import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateNotificationDto {
  @ApiPropertyOptional({ example: 'Updated Title' })
  @IsOptional() @IsString() title?: string;

  @ApiPropertyOptional({ example: 'Updated message content.' })
  @IsOptional() @IsString() message?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean() is_read?: boolean;
}

