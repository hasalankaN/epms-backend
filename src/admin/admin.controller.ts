import { Controller, Post, Body, Param, Patch, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminRegisterDto } from './dto/admin-register.dto';
import { AdminUpdateDto } from './dto/admin-update.dto';
import { AdminUpdatePasswordDto } from './dto/admin-update-password.dto';
import { AdminQueryDto } from './dto/admin-query.dto';
import { SendPasswordOtpDto } from './dto/send-password-otp.dto';
import { ConfirmPasswordOtpDto } from './dto/confirm-password-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

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
}
