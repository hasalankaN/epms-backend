import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { UserRole } from '../../common/enums/roles.enum';

export class UpdateEmployeeRoleDto {
  @ApiProperty({ enum: UserRole, example: UserRole.SUPERVISOR, description: 'New role to assign' })
  @IsEnum(UserRole)
  role: UserRole;
}

