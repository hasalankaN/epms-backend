import { Controller, Post, Body, Get, Param, Patch, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { DepartmentService } from './department.service';
import { CreateDepartmentDto } from './dto/create-departments.dto';
import { DepartmentQueryDto } from './dto/department-query.dto';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../common/enums/roles.enum';
import { UpdateDepartmentDto } from './dto/update-department.dto';


@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('department')
@Controller('department')
export class DepartmentController {
    constructor(private readonly departmentService: DepartmentService) { }

    @Post('create')
    @Roles(UserRole.ADMIN, UserRole.HR)
    @ApiOperation({ summary: 'Create a new department' })
    @ApiResponse({ status: 201, description: 'Department created successfully' })
    @ApiResponse({ status: 409, description: 'Department with this name already exists' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async create(@Body() dto: CreateDepartmentDto) {
        return this.departmentService.create(dto);
    }

    @Get()
    @ApiOperation({ summary: 'List departments with pagination and search' })
    @ApiResponse({ status: 200, description: 'List of departments' })
    async list(@Query() query: DepartmentQueryDto) {
        return this.departmentService.listDepartments(query);
    }

    @Patch(':id')
    @Roles(UserRole.ADMIN, UserRole.HR)
    @ApiOperation({ summary: 'Update an existing department by ID' })
    @ApiResponse({ status: 200, description: 'Department updated successfully' })
    @ApiResponse({ status: 404, description: 'Department not found' })
    @ApiResponse({ status: 409, description: 'Department name already exists' })
    async update(@Body() dto: UpdateDepartmentDto,) {
        return this.departmentService.update(dto.id, dto);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Delete a department by ID (Admin only)' })
    @ApiParam({ name: 'id', description: 'Department UUID / ID', example: 'uuid-1234-5678' })
    @ApiResponse({ status: 200, description: 'Department deleted successfully' })
    @ApiResponse({ status: 404, description: 'Department not found' })
    async delete(@Param('id') id: string) {
        return this.departmentService.delete(id);
    }
}