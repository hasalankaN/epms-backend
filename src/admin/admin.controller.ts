import { Controller, Post, Body, Param, Patch, Get, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminRegisterDto } from './dto/admin-register.dto';
import { AdminUpdateDto } from './dto/admin-update.dto';
import { AdminUpdatePasswordDto } from './dto/admin-update-password.dto';
import { AdminQueryDto } from './dto/admin-query.dto';
import { SendPasswordOtpDto } from './dto/send-password-otp.dto';
import { ConfirmPasswordOtpDto } from './dto/confirm-password-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AdminEmployeeRequestQueryDto } from './dto/admin-employee-request-query.dto';
import { RejectRequestDto } from './dto/reject-request.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../common/enums/roles.enum';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('login')
  @ApiOperation({ summary: 'Admin login' })
  @ApiResponse({ status: 201, description: 'Login successful' })
  async login(@Body() dto: AdminLoginDto) {
    return this.adminService.login(dto.email, dto.password, dto.rememberMe || false);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new admin' })
  @ApiResponse({ status: 201, description: 'Admin created and credentials emailed' })
  async register(@Body() dto: AdminRegisterDto) {
    return this.adminService.register(dto);
  }

  @Patch(':adminId')
  @ApiOperation({ summary: 'Update admin account details' })
  @ApiResponse({ status: 200, description: 'Admin updated' })
  async updateDetails(@Param('adminId') adminId: string, @Body() dto: AdminUpdateDto) {
    return this.adminService.updateDetails(adminId, dto);
  }

  @Post(':adminId/password')
  @ApiOperation({ summary: 'Update admin password (sends new password by email)' })
  @ApiResponse({ status: 200, description: 'Password updated and emailed' })
  async updatePassword(@Param('adminId') adminId: string, @Body() dto: AdminUpdatePasswordDto) {
    return this.adminService.updatePassword(adminId, dto);
  }

  @Post('password/send-otp')
  @ApiOperation({ summary: 'Send password verification OTP to admin email' })
  @ApiResponse({ status: 200, description: 'OTP sent if email exists' })
  async sendPasswordOtp(@Body() dto: SendPasswordOtpDto) {
    return this.adminService.sendPasswordOtp(dto.email);
  }

  @Post('password/confirm-otp')
  @ApiOperation({ summary: 'Confirm password OTP for admin email' })
  @ApiResponse({ status: 200, description: 'OTP confirmed' })
  async confirmPasswordOtp(@Body() dto: ConfirmPasswordOtpDto) {
    return this.adminService.confirmPasswordOtp(dto.email, dto.otp);
  }

  @Post('password/reset')
  @ApiOperation({ summary: 'Reset password using confirmed reset token' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.adminService.resetPassword(dto.email, dto.resetToken, dto.newPassword);
  }

  @Get()
  @ApiOperation({ summary: 'List admins with pagination and search' })
  @ApiResponse({ status: 200, description: 'List of admins' })
  async list(@Query() query: AdminQueryDto) {
    return this.adminService.listAdmins(query);
  }

  @Get('employee-requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin view all employee account requests with filters and pagination' })
  @ApiResponse({ status: 200, description: 'List of employee account requests' })
  async listEmployeeRequests(@Query() query: AdminEmployeeRequestQueryDto) {
    return this.adminService.listEmployeeRequests(query);
  }

  @Get('employee-requests/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin get full details of an employee account request' })
  @ApiParam({ name: 'id', description: 'Request UUID' })
  @ApiResponse({ status: 200, description: 'Request details' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async getEmployeeRequestById(@Param('id') id: string) {
    return this.adminService.getEmployeeRequestById(id);
  }

  @Patch('employee-requests/:id/accept')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin accept/approve employee account request (creates employee & user account, sends credentials email, notifies HR)' })
  @ApiParam({ name: 'id', description: 'Request UUID' })
  @ApiResponse({ status: 200, description: 'Request approved and employee created' })
  @ApiResponse({ status: 400, description: 'Request is not pending or user already exists' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async acceptEmployeeRequest(@Param('id') id: string, @Req() req: any) {
    const adminUserId = req.user?.sub || req.user?.userId;
    return this.adminService.acceptEmployeeRequest(id, adminUserId);
  }

  @Patch('employee-requests/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin reject employee account request with reason (notifies HR)' })
  @ApiParam({ name: 'id', description: 'Request UUID' })
  @ApiResponse({ status: 200, description: 'Request rejected' })
  @ApiResponse({ status: 400, description: 'Request is not pending' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async rejectEmployeeRequest(
    @Param('id') id: string,
    @Body() dto: RejectRequestDto,
    @Req() req: any,
  ) {
    const adminUserId = req.user?.sub || req.user?.userId;
    return this.adminService.rejectEmployeeRequest(id, adminUserId, dto.reason);
  }
}
