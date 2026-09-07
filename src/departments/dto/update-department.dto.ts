import { PartialType } from '@nestjs/swagger';
import { CreateDepartmentDto } from './create-departments.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class UpdateDepartmentDto extends PartialType(CreateDepartmentDto) {
    @ApiProperty({
        description: 'Department ID / UUID',
        example: 'd3b07384-d113-4607-9580-da0d20d36e2f',
    })
    @IsNotEmpty()
    @IsUUID()
    id: string;
}