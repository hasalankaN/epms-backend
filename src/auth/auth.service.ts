import {
  Injectable,
  Inject,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, gt, sql } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { FirebaseService } from '../firebase/firebase.service';
import { EmailService } from '../email/email.service';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
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

@Injectable()
export class AuthService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly firebaseService: FirebaseService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Generate 4-digit OTP
   */
  private generateOtp(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  /**
   * Hash OTP using HMAC-SHA256
   */
  private hashOtp(otp: string): string {
    const secret = this.configService.get<string>('OTP_SECRET') || 'default-secret';
    return crypto.createHmac('sha256', secret).update(otp).digest('hex');
  }

  /**
   * Generate JWT tokens
   */
  private generateTokens(user: schema.User, rememberMe: boolean = false) {
    const payload = {
      sub: user.user_id,
      email: user.email,
      role: user.role,
    };

    const accessTokenExpiry = rememberMe ? '7d' : '24h';

    return {
      access_token: this.jwtService.sign(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: accessTokenExpiry,
      }),
      refresh_token: this.jwtService.sign(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    };
  }

  /**
   * Send OTP via email using EmailService
   */
  private async sendOtpEmail(email: string, otp: string, type: 'verification' | 'reset' = 'verification', name?: string) {
    // Always log the OTP locally for debugging
    console.log(`[AuthService] OTP for ${email} (${type}):`, otp);

    if (type === 'verification') {
      await this.emailService.sendOtpEmail(email, otp, name);
    } else {
      await this.emailService.sendPasswordResetEmail(email, otp, name);
    }
  }

  /**
   * Register new user
   */
  async register(dto: RegisterDto) {
    // Check if user exists
    const existingUser = await this.db.query.users.findFirst({
      where: eq(schema.users.email, dto.email),
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Generate OTP
    const otp = this.generateOtp();
    const otpHash = this.hashOtp(otp);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create user using Drizzle insert (explicit columns)
    let newUser: schema.User;
    try {
      const [created] = await this.db
        .insert(schema.users)
        .values({
          first_name: dto.firstName,
          last_name: dto.lastName,
          email: dto.email,
          password_hash: passwordHash,
          phone_number: dto.phoneNumber || null,
          country_code: dto.countryCode || null,
          otp_code: otpHash,
          otp_expires_at: otpExpiresAt,
        })
        .returning();

      newUser = created;
    } catch (error) {
      console.error('[AuthService] DB insert error:', {
        message: error?.message,
        detail: error?.detail,
        code: error?.code,
        hint: error?.hint,
        stack: error?.stack,
      });
      throw new InternalServerErrorException('Database insert failed: ' + (error?.detail || error?.message || 'unknown'));
    }

    // Send OTP email
    await this.sendOtpEmail(dto.email, otp, 'verification', dto.firstName);

    return {
      message: 'Registration successful. Please check your email for OTP verification.',
      userId: newUser.user_id,
      firstName: newUser.first_name,
      lastName: newUser.last_name,
      email: newUser.email,
      phoneNumber: newUser.phone_number,
      countryCode: newUser.country_code,
      role: newUser.role,
    };
  }

  /**
   * Validate email with OTP
   */
  async validateEmail(dto: ValidateEmailDto) {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.email, dto.email),
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.email_verified) {
      throw new BadRequestException('Email already verified');
    }

    if (!user.otp_code || !user.otp_expires_at) {
      throw new BadRequestException('No OTP found. Please request a new one.');
    }

    // Check expiry
    if (new Date() > user.otp_expires_at) {
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }

    // Verify OTP
    const otpHash = this.hashOtp(dto.otpCode);
    if (otpHash !== user.otp_code) {
      throw new BadRequestException('Invalid OTP');
    }

    // Mark email as verified
    await this.db
      .update(schema.users)
      .set({
        email_verified: true,
        otp_code: null,
        otp_expires_at: null,
      })
      .where(eq(schema.users.user_id, user.user_id));

    // Send welcome email
    await this.emailService.sendWelcomeEmail(user.email, user.first_name);

    return {
      message: 'Email successfully verified',
    };
  }

  /**
   * Login with email and password
   */
  async login(dto: LoginDto) {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.email, dto.email),
    });

    if (!user || !user.password_hash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if email is verified
    if (!user.email_verified) {
      throw new UnauthorizedException('Please verify your email before logging in');
    }

    // Update last login and optional device info
    const updateData: any = { last_login: new Date() };
    if ((dto as any).deviceToken) updateData.device_token = (dto as any).deviceToken;
    if ((dto as any).deviceId) updateData.device_id = (dto as any).deviceId;
    if ((dto as any).deviceType) updateData.device_type = (dto as any).deviceType;
    if ((dto as any).appVersion) updateData.app_version = (dto as any).appVersion;
    if ((dto as any).timeZone) updateData.time_zone = (dto as any).timeZone;

    await this.db
      .update(schema.users)
      .set(updateData)
      .where(eq(schema.users.user_id, user.user_id));

    // Generate tokens
    const tokens = this.generateTokens(user, dto.rememberMe || false);

    return {
      ...tokens,
      user: {
        userId: user.user_id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phoneNumber: user.phone_number,
        countryCode: user.country_code,
        role: user.role,
        status: user.status,
      },
    };
  }

  /**
   * Firebase authentication
   */
  async firebaseAuth(dto: FirebaseAuthDto) {
    // Verify Firebase token
    const decodedToken = await this.firebaseService.verifyIdToken(dto.firebaseToken);
    
    const email = decodedToken.email;
    if (!email) {
      throw new BadRequestException('Email not found in Firebase token');
    }

    // Check if user exists
    let user = await this.db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });

    let requiresEmailVerification = false;

    if (!user) {
      // Create new user
      const displayName = decodedToken.name || email.split('@')[0];
      const nameParts = displayName.split(' ');
      const firstName = nameParts[0] || 'User';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Create user - using raw SQL
      const result = await this.db.execute(sql`
        INSERT INTO users (first_name, last_name, email, firebase_uid${decodedToken.email_verified ? sql`, email_verified` : sql``})
        VALUES (${firstName}, ${lastName}, ${email}, ${decodedToken.uid}${decodedToken.email_verified ? sql`, ${true}` : sql``})
        RETURNING *
      `);
      
      const newUser = result.rows[0] as schema.User;
      user = newUser;

      // For email/password providers, send OTP if not verified
      if (!decodedToken.email_verified && decodedToken.firebase?.sign_in_provider === 'password') {
        const otp = this.generateOtp();
        const otpHash = this.hashOtp(otp);
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await this.db
          .update(schema.users)
          .set({
            otp_code: otpHash,
            otp_expires_at: otpExpiresAt,
          })
          .where(eq(schema.users.user_id, user.user_id));

        await this.sendOtpEmail(email, otp, 'verification');
        requiresEmailVerification = true;
      }
    } else {
      // Update existing user
      await this.db
        .update(schema.users)
        .set({
          firebase_uid: decodedToken.uid,
          email_verified: decodedToken.email_verified || user.email_verified,
          last_login: new Date(),
        })
        .where(eq(schema.users.user_id, user.user_id));

      // Refresh user data
      user = await this.db.query.users.findFirst({
        where: eq(schema.users.user_id, user.user_id),
      });
    }

    // Generate tokens
    const tokens = this.generateTokens(user!);

    return {
      ...tokens,
      requiresEmailVerification,
      user: {
        userId: user!.user_id,
        firstName: user!.first_name,
        lastName: user!.last_name,
        email: user!.email,
        phoneNumber: user!.phone_number,
        countryCode: user!.country_code,
        role: user!.role,
        status: user!.status,
        firebaseUid: user!.firebase_uid,
        emailVerified: user!.email_verified,
      },
    };
  }

  /**
   * Sync user profile from Firebase
   */
  async syncFirebaseUser(dto: FirebaseSyncUserDto) {
    // Verify Firebase token
    const decodedToken = await this.firebaseService.verifyIdToken(dto.firebaseToken);
    
    const email = decodedToken.email;
    if (!email) {
      throw new BadRequestException('Email not found in Firebase token');
    }

    // Find user
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update user
    const updateData: any = {};
    if (dto.firstName) updateData.first_name = dto.firstName;
    if (dto.lastName) updateData.last_name = dto.lastName;
    if (dto.phoneNumber) updateData.phone_number = dto.phoneNumber;
    if (dto.countryCode) updateData.country_code = dto.countryCode;
    updateData.updated_at = new Date();

    await this.db
      .update(schema.users)
      .set(updateData)
      .where(eq(schema.users.user_id, user.user_id));

    // Get updated user
    const updatedUser = await this.db.query.users.findFirst({
      where: eq(schema.users.user_id, user.user_id),
    });

    return {
      message: 'User profile updated successfully',
      user: {
        userId: updatedUser!.user_id,
        firstName: updatedUser!.first_name,
        lastName: updatedUser!.last_name,
        email: updatedUser!.email,
        phoneNumber: updatedUser!.phone_number,
        countryCode: updatedUser!.country_code,
        role: updatedUser!.role,
        status: updatedUser!.status,
      },
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(dto: RefreshTokenDto) {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify(dto.refresh_token, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      // Get user
      const user = await this.db.query.users.findFirst({
        where: eq(schema.users.user_id, payload.sub),
      });

      if (!user || user.status !== 'Active') {
        throw new UnauthorizedException('User not found or inactive');
      }

      // Generate new tokens
      const tokens = this.generateTokens(user);

      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Resend OTP for password reset
   */
  async resendOtp(dto: ResendOtpDto) {
    // Rate limiting: max 3 OTP requests per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentOtps = await this.db
      .select()
      .from(schema.passwordResetOtps)
      .where(
        and(
          eq(schema.passwordResetOtps.email, dto.email),
          gt(schema.passwordResetOtps.created_at, oneHourAgo),
        ),
      );

    if (recentOtps.length >= 3) {
      throw new BadRequestException('Too many OTP requests. Please try again later.');
    }

    // Generate OTP
    const otp = this.generateOtp();
    const otpHash = this.hashOtp(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP
    await this.db.insert(schema.passwordResetOtps).values({
      email: dto.email,
      otp_hash: otpHash,
      expires_at: expiresAt,
    });

    // Send OTP email
    await this.sendOtpEmail(dto.email, otp, 'reset');

    return {
      message: 'OTP sent successfully',
    };
  }

  /**
   * Validate OTP for password reset (does NOT consume OTP)
   */
  async validateOtpForReset(dto: ValidateOtpForResetDto) {
    // Find valid OTP
    const otpRecords = await this.db
      .select()
      .from(schema.passwordResetOtps)
      .where(
        and(
          eq(schema.passwordResetOtps.email, dto.email),
          eq(schema.passwordResetOtps.is_used, false),
        ),
      )
      .orderBy(schema.passwordResetOtps.created_at);

    if (otpRecords.length === 0) {
      throw new BadRequestException('No valid OTP found');
    }

    const otpRecord = otpRecords[otpRecords.length - 1]; // Get latest

    // Check expiry
    if (new Date() > otpRecord.expires_at) {
      throw new BadRequestException('OTP has expired');
    }

    // Check attempts
    const attempts = otpRecord.attempts || 0;
    if (attempts >= 5) {
      throw new BadRequestException('Too many attempts. Please request a new OTP.');
    }

    // Verify OTP
    const otpHash = this.hashOtp(dto.otpCode);
    if (otpHash !== otpRecord.otp_hash) {
      // Increment attempts
      await this.db
        .update(schema.passwordResetOtps)
        .set({ attempts: attempts + 1 })
        .where(eq(schema.passwordResetOtps.id, otpRecord.id));

      throw new BadRequestException('Invalid OTP');
    }

    // Generate reset token (5 minutes validity)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Store reset token
    await this.db.insert(schema.passwordResetTokens).values({
      email: dto.email,
      token: resetToken,
      associated_otp_id: otpRecord.id,
      expires_at: tokenExpiresAt,
    });

    return {
      status: 'SUCCESS',
      message: 'OTP valid',
      data: {
        resetToken,
      },
    };
  }

  /**
   * Reset password with token (consumes token and OTP)
   */
  async resetPasswordWithToken(dto: ResetPasswordWithTokenDto) {
    // Find valid token
    const tokenRecord = await this.db.query.passwordResetTokens.findFirst({
      where: and(
        eq(schema.passwordResetTokens.email, dto.email),
        eq(schema.passwordResetTokens.token, dto.resetToken),
        eq(schema.passwordResetTokens.is_used, false),
      ),
    });

    if (!tokenRecord) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Check expiry
    if (new Date() > tokenRecord.expires_at) {
      throw new BadRequestException('Reset token has expired');
    }

    // Find user
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.email, dto.email),
    });

    // Update password in Firebase if user has firebase_uid
    if (user?.firebase_uid) {
      try {
        await this.firebaseService.updateUser(user.firebase_uid, {
          password: dto.newPassword,
        });
      } catch (error) {
        // If Firebase user doesn't exist, create one
        if (error.message.includes('user-not-found')) {
          await this.firebaseService.createUser({
            uid: user.firebase_uid,
            email: dto.email,
            password: dto.newPassword,
          });
        } else {
          throw error;
        }
      }
    }

    // Update password in database
    if (user) {
      const passwordHash = await bcrypt.hash(dto.newPassword, 10);
      await this.db
        .update(schema.users)
        .set({ password_hash: passwordHash })
        .where(eq(schema.users.user_id, user.user_id));
    }

    // Mark token as used
    await this.db
      .update(schema.passwordResetTokens)
      .set({ is_used: true })
      .where(eq(schema.passwordResetTokens.id, tokenRecord.id));

    // Mark OTP as used if associated
    if (tokenRecord.associated_otp_id) {
      await this.db
        .update(schema.passwordResetOtps)
        .set({ is_used: true })
        .where(eq(schema.passwordResetOtps.id, tokenRecord.associated_otp_id));
    }

    // Send password changed confirmation email
    if (user) {
      await this.emailService.sendPasswordChangedEmail(user.email, user.first_name);
    }

    return {
      status: 'SUCCESS',
      message: 'Password updated successfully.',
    };
  }

  /**
   * Change password for logged-in user
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.user_id, userId),
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    if (user.password_hash) {
      const isPasswordValid = await bcrypt.compare(dto.current_password, user.password_hash);
      if (!isPasswordValid) {
        throw new BadRequestException('Current password is incorrect');
      }
    } else if (user.firebase_uid) {
      // Verify with Firebase REST API
      const apiKey = this.configService.get<string>('FIREBASE_WEB_API_KEY');
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            password: dto.current_password,
            returnSecureToken: true,
          }),
        },
      );

      if (!response.ok) {
        throw new BadRequestException('Current password is incorrect');
      }
    }

    // Ensure new password is different
    if (dto.current_password === dto.new_password) {
      throw new BadRequestException('New password must be different from current password');
    }

    // Update password in Firebase if user has firebase_uid
    if (user.firebase_uid) {
      await this.firebaseService.updateUser(user.firebase_uid, {
        password: dto.new_password,
      });
    }

    // Update password in database
    const passwordHash = await bcrypt.hash(dto.new_password, 10);
    await this.db
      .update(schema.users)
      .set({ password_hash: passwordHash })
      .where(eq(schema.users.user_id, userId));

    // Send password changed confirmation email
    await this.emailService.sendPasswordChangedEmail(user.email, user.first_name);

    return {
      status: 'SUCCESS',
      message: 'Password changed successfully',
    };
  }

  /**
   * Logout (client-side token invalidation)
   */
  async logout() {
    return {
      message: 'Logged out successfully',
    };
  }
}
