import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { UserRole } from '../../common/enums/roles.enum';

export class AssignEmployeeRoleDto {
  @ApiProperty({ enum: UserRole, example: UserRole.HR, description: 'Role to assign' })
  @IsEnum(UserRole)
  role: UserRole;
}

