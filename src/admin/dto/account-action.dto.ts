import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export class AccountActionDto {
  @ApiPropertyOptional({ enum: ['delete', 'deactivate'], example: 'deactivate', description: 'Action to perform on the account' })
  @IsOptional()
  @IsEnum(['delete', 'deactivate'])
  action?: 'delete' | 'deactivate';
}

