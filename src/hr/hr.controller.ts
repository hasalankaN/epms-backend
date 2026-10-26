import { Controller, Post, Get, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { HrService } from './hr.service';
import { CreateEmployeeRequestDto } from './dto/create-employee-request.dto';
import { EmployeeRequestQueryDto } from './dto/employee-request-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../common/enums/roles.enum';

@ApiTags('hr')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('hr')
export class HrController {
  constructor(private readonly hrService: HrService) {}

  @Post('employee-request')
  @Roles(UserRole.HR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Submit a new employee account request to Admin for approval (HR)' })
  @ApiResponse({ status: 201, description: 'Employee request submitted and notification sent to Admin' })
  @ApiResponse({ status: 400, description: 'Validation error or duplicate email/EPF' })
  async createEmployeeRequest(@Body() dto: CreateEmployeeRequestDto, @Req() req: any) {
    const requestedBy = req.user?.sub || req.user?.userId;
    return this.hrService.createEmployeeRequest(dto, requestedBy);
  }

  @Get('employee-requests')
  @Roles(UserRole.HR, UserRole.ADMIN)
  @ApiOperation({ summary: 'List employee account requests submitted by HR with pagination and filters' })
  @ApiResponse({ status: 200, description: 'List of requests' })
  async listEmployeeRequests(@Query() query: EmployeeRequestQueryDto, @Req() req: any) {
    // If HR, show all requests or own requests
    return this.hrService.listEmployeeRequests(query);
  }

  @Get('employee-requests/:id')
  @Roles(UserRole.HR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get employee account request details by ID' })
  @ApiParam({ name: 'id', description: 'Request UUID' })
  @ApiResponse({ status: 200, description: 'Request details' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async getEmployeeRequestById(@Param('id') id: string) {
    return this.hrService.getEmployeeRequestById(id);
  }
}
