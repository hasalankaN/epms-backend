import { Controller, Post, Body, Param, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { EmployeeRegisterDto } from './dto/employee-register.dto';
import { EmployeeQueryDto } from './dto/employee-query.dto';
import { EmployeeService } from './employee.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../common/enums/roles.enum';

@ApiTags('employee')
@Controller('employee')
export class EmployeeController {
    constructor(private readonly employeeService: EmployeeService) { }

    @Post('register')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.HR)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Register a new employee directly (Admin / HR)' })
    @ApiResponse({ status: 201, description: 'Employee created and credentials emailed' })
    async register(@Body() dto: EmployeeRegisterDto) {
        return this.employeeService.register(dto);
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'View all employees with position name, department, user status, supervisor, and all related data' })
    @ApiResponse({ status: 200, description: 'List of employees retrieved successfully' })
    async findAll(@Query() query: EmployeeQueryDto) {
        return this.employeeService.findAll(query);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get single employee by ID with complete details (position, department, user, contacts, qualifications, dependents)' })
    @ApiParam({ name: 'id', description: 'Employee UUID' })
    @ApiResponse({ status: 200, description: 'Employee details' })
    @ApiResponse({ status: 404, description: 'Employee not found' })
    async findOne(@Param('id') id: string) {
        return this.employeeService.findOne(id);
    }
}
