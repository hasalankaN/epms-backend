import { Controller, Post, Body, Param, Patch, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EmployeeRegisterDto } from './dto/employee-register.dto';
import { EmployeeService } from './employee.service';


@ApiTags('employee')
@Controller('employee')
export class EmployeeController {
    constructor(private readonly employeeService: EmployeeService) { }

    @Post('register')
    @ApiOperation({ summary: 'Register a new employee' })
    @ApiResponse({ status: 201, description: 'Employee created and credentials emailed' })
    async register(@Body() dto: EmployeeRegisterDto) {
        return this.employeeService.register(dto);
    }
}
