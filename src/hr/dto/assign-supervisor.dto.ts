import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignSupervisorDto {
  @ApiProperty({ example: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', description: 'Supervisor employee UUID' })
  @IsUUID()
  supervisor_id: string;
}

