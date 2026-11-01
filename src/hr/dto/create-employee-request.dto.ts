import { IsEmail, IsNotEmpty, IsString, IsOptional, IsDateString, IsUUID, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../common/enums/roles.enum';
import { EmergencyContactDto, QualificationDto, DependentDto } from '../../employee/dto/employee-register.dto';

export class CreateEmployeeRequestDto {
  // --- Personal Identity ---
  @ApiProperty({ example: 'Kamal' })
  @IsString()
  @IsNotEmpty()
  first_name: string;

  @ApiProperty({ example: 'Silva' })
  @IsString()
  @IsNotEmpty()
  last_name: string;

  @ApiProperty({ example: '1995-08-20' })
  @IsDateString()
  @IsNotEmpty()
  dob: string;

  @ApiProperty({ example: '2024-01-15' })
  @IsDateString()
  @IsNotEmpty()
  join_date: string;

  // --- Work & Contact Details ---
  @ApiPropertyOptional({ example: 'EMP-0001', description: 'Readable employee number (auto-generated if omitted)' })
  @IsString()
  @IsOptional()
  employee_no?: string;

  @ApiProperty({ example: 'EPF-10294' })
  @IsString()
  @IsNotEmpty()
  epf_no: string;

  @ApiProperty({ example: 'kamal.silva@company.com' })
  @IsEmail()
  @IsNotEmpty()
  work_email: string;

  @ApiPropertyOptional({ example: 'kamal.personal@gmail.com' })
  @IsEmail()
  @IsOptional()
  personal_email?: string;

  @ApiPropertyOptional({ example: '+94712345678' })
  @IsString()
  @IsOptional()
  mobile_no?: string;

  @ApiPropertyOptional({ example: '+94112223334' })
  @IsString()
  @IsOptional()
  home_tp?: string;

  // --- Address ---
  @ApiPropertyOptional({ example: '123, Main Street' })
  @IsString()
  @IsOptional()
  street?: string;

  @ApiPropertyOptional({ example: 'Colombo' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: 'Western' })
  @IsString()
  @IsOptional()
  province?: string;

  @ApiPropertyOptional({ example: 'Sri Lanka' })
  @IsString()
  @IsOptional()
  country?: string;

  // --- Foreign Keys / Organization Relations ---
  @ApiPropertyOptional({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @IsUUID()
  @IsOptional()
  department_id?: string;

  @ApiPropertyOptional({ example: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22' })
  @IsUUID()
  @IsOptional()
  position_id?: string;

  @ApiPropertyOptional({ example: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33' })
  @IsUUID()
  @IsOptional()
  supervisor_id?: string;

  @ApiPropertyOptional({ enum: UserRole, example: UserRole.EMPLOYEE, description: 'Role assigned once account is approved' })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole = UserRole.EMPLOYEE;

  // --- Nested Relational Collections ---
  @ApiPropertyOptional({ type: [EmergencyContactDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => EmergencyContactDto)
  emergency_contacts?: EmergencyContactDto[];

  @ApiPropertyOptional({ type: [QualificationDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => QualificationDto)
  qualifications?: QualificationDto[];

  @ApiPropertyOptional({ type: [DependentDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => DependentDto)
  dependents?: DependentDto[];
}
