import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { GetUser } from './get-user.decorator';
import {
  RegisterDto,
  LoginDto,
  ValidateEmailDto,
  ResendOtpDto,
  FirebaseAuthDto,
  FirebaseSyncUserDto,
  RefreshTokenDto,
  ValidateOtpForResetDto,
  ResetPasswordWithTokenDto,
  ChangePasswordDto,
} from './dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user with email/password' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('validate-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email with OTP code' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid OTP or expired' })
  async validateEmail(@Body() dto: ValidateEmailDto) {
    return this.authService.validateEmail(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('firebase/auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate with Firebase token' })
  @ApiResponse({ status: 200, description: 'Authentication successful' })
  @ApiResponse({ status: 400, description: 'Invalid Firebase token' })
  async firebaseAuth(@Body() dto: FirebaseAuthDto) {
    return this.authService.firebaseAuth(dto);
  }

  @Post('firebase/sync-user')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync user profile from Firebase' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async syncFirebaseUser(@Body() dto: FirebaseSyncUserDto) {
    return this.authService.syncFirebaseUser(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({ status: 200, description: 'Tokens refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request OTP for password reset' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  @ApiResponse({ status: 400, description: 'Too many requests' })
  async resendOtp(@Body() dto: ResendOtpDto) {
    return this.authService.resendOtp(dto);
  }

  @Post('validate-otp-for-reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate OTP and get reset token' })
  @ApiResponse({ status: 200, description: 'OTP validated, reset token issued' })
  @ApiResponse({ status: 400, description: 'Invalid OTP' })
  async validateOtpForReset(@Body() dto: ValidateOtpForResetDto) {
    return this.authService.validateOtpForReset(dto);
  }

  @Post('reset-password-with-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using reset token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPasswordWithToken(@Body() dto: ResetPasswordWithTokenDto) {
    return this.authService.resetPasswordWithToken(dto);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password for logged-in user' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid current password' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async changePassword(
    @GetUser('sub') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout (client must discard tokens)' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout() {
    return this.authService.logout();
  }
}
