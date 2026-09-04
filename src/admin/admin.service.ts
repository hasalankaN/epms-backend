import { Injectable, UnauthorizedException, Inject, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, sql, and } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import * as schema from '../database/schema';
import { DATABASE_CONNECTION } from '../database/database.module';
import { EmailService } from '../email/email.service';
import { AdminRegisterDto } from './dto/admin-register.dto';
import { AdminUpdateDto } from './dto/admin-update.dto';
import { AdminUpdatePasswordDto } from './dto/admin-update-password.dto';
import { AdminQueryDto } from './dto/admin-query.dto';

@Injectable()
export class AdminService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: NodePgDatabase<typeof schema>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  private hashOtp(otp: string): string {
    const secret = this.configService.get<string>('OTP_SECRET') || 'default-secret';
    return crypto.createHmac('sha256', secret).update(otp).digest('hex');
  }

  private generateTokens(user: schema.User, rememberMe: boolean = false) {
    const payload = { sub: user.user_id, email: user.email, role: user.role };
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

  async login(email: string, password: string, rememberMe: boolean = false) {
    let user: schema.User | undefined;
    try {
      user = await this.db.query.users.findFirst({ where: eq(schema.users.email, email) });
    } catch (err) {
      console.error('[AdminService][login] DB query error:', err);
      throw new InternalServerErrorException('Database error while fetching admin');
    }
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check admin role
    if (!user.role || user.role.toLowerCase() !== 'admin') {
      throw new UnauthorizedException('Access denied. Admin privileges required.');
    }

    // Password validation: bcrypt check with fallback to plain text if legacy
    let isPasswordValid = false;
    if (user.password_hash) {
      try {
        isPasswordValid = await bcrypt.compare(password, user.password_hash);
      } catch (e) {
        isPasswordValid = false;
      }
      if (!isPasswordValid && user.password_hash === password) {
        isPasswordValid = true;
      }
    }

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.db.update(schema.users).set({ last_login: new Date() }).where(eq(schema.users.user_id, user.user_id));

    const tokens = this.generateTokens(user, rememberMe);

    return {
      ...tokens,
      admin: {
        adminId: user.user_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phoneNumber: user.phone_number,
        countryCode: user.country_code,
        role: user.role,
        lastLogin: user.last_login,
      },
    };
  }

  async register(dto: AdminRegisterDto) {
    // check existing
    let existing: schema.User | undefined;
    try {
      existing = await this.db.query.users.findFirst({ where: eq(schema.users.email, dto.email) });
    } catch (err) {
      console.error('[AdminService][register] DB query error while checking existing user:', err);
      throw new InternalServerErrorException('Database error while checking existing user');
    }

    if (existing) {
      throw new BadRequestException('User with this email already exists');
    }

    // hash password with bcrypt
    const passwordHash = await bcrypt.hash(dto.password, 10);

    let created: schema.User;
    try {
      const res = await this.db.insert(schema.users).values({
        email: dto.email,
        password_hash: passwordHash,
        phone_number: dto.phoneNumber || null,
        country_code: dto.countryCode || null,
        first_name: dto.firstName,
        last_name: dto.lastName,
        role: 'admin',
        status: 'Active',
        email_verified: true,
      }).returning();
      [created] = res;
    } catch (err) {
      console.error('[AdminService][register] DB insert error:', err);
      throw new InternalServerErrorException('Database error while creating admin');
    }

    // Send email to admin with credentials
    const content = `
      <div class="email-content">
        <p>Hi ${created.first_name},</p>
        <p>Your admin account has been created for <strong>Fitness Coaching</strong>.</p>
        <div class="info-box">
          <p><strong>Credentials</strong></p>
          <p>Email: <strong>${created.email}</strong></p>
          <p>Password: <strong>${dto.password}</strong></p>
        </div>
        <p>Please change your password after your first login.</p>
        <p style="margin-top:20px;">Best regards,<br/><strong style="color: #7F435F;">The Fitness Coaching Team</strong></p>
      </div>
    `;

    await this.emailService.sendCustomEmail({
      to: created.email,
      subject: 'Your Admin Account - Fitness Coaching',
      htmlContent: this.emailService['getEmailTemplate'] ? (this.emailService as any).getEmailTemplate(content) : content,
    });

    return {
      message: 'Admin registered successfully',
      adminId: created.user_id,
      email: created.email,
    };
  }

  async updateDetails(adminId: string, dto: AdminUpdateDto) {
    let user: schema.User | undefined;
    try {
      user = await this.db.query.users.findFirst({ where: eq(schema.users.user_id, adminId) });
    } catch (err) {
      console.error('[AdminService][updateDetails] DB query error:', err);
      throw new InternalServerErrorException('Database error while fetching admin');
    }
    if (!user) {
      throw new BadRequestException('Admin not found');
    }

    const updateData: any = {};
    if (dto.firstName !== undefined) updateData.first_name = dto.firstName;
    if (dto.lastName !== undefined) updateData.last_name = dto.lastName;
    if (dto.phoneNumber !== undefined) updateData.phone_number = dto.phoneNumber;
    if (dto.countryCode !== undefined) updateData.country_code = dto.countryCode;
    if (dto.email !== undefined) updateData.email = dto.email;
    updateData.updated_at = new Date();

    try {
      await this.db.update(schema.users).set(updateData).where(eq(schema.users.user_id, adminId));
    } catch (err) {
      console.error('[AdminService][updateDetails] DB update error:', err);
      throw new InternalServerErrorException('Database error while updating admin');
    }

    const updated = await this.db.query.users.findFirst({ where: eq(schema.users.user_id, adminId) });
    return {
      message: 'Admin updated successfully',
      admin: {
        adminId: updated!.user_id,
        email: updated!.email,
        firstName: updated!.first_name,
        lastName: updated!.last_name,
        phoneNumber: updated!.phone_number,
        countryCode: updated!.country_code,
        role: updated!.role,
        lastLogin: updated!.last_login,
      },
    };
  }

  async updatePassword(adminId: string, dto: AdminUpdatePasswordDto) {
    let user: schema.User | undefined;
    try {
      user = await this.db.query.users.findFirst({ where: eq(schema.users.user_id, adminId) });
    } catch (err) {
      console.error('[AdminService][updatePassword] DB query error:', err);
      throw new InternalServerErrorException('Database error while fetching admin');
    }
    if (!user) {
      throw new BadRequestException('Admin not found');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    try {
      await this.db.update(schema.users).set({ password_hash: passwordHash, updated_at: new Date() }).where(eq(schema.users.user_id, adminId));
    } catch (err) {
      console.error('[AdminService][updatePassword] DB update error:', err);
      throw new InternalServerErrorException('Database error while updating password');
    }

    // Send email with new password
    const content = `
      <div class="email-content">
        <p>Hi ${user.first_name},</p>
        <p>Your admin account password has been updated.</p>
        <div class="info-box">
          <p><strong>New Password</strong></p>
          <p>Password: <strong>${dto.newPassword}</strong></p>
        </div>
        <p>If you did not request this change, please contact support immediately.</p>
        <p style="margin-top:20px;">Best regards,<br/><strong style="color: #7F435F;">The Fitness Coaching Team</strong></p>
      </div>
    `;

    try {
      await this.emailService.sendCustomEmail({
        to: user.email,
        subject: 'Your Admin Account Password Has Been Updated - Fitness Coaching',
        htmlContent: this.emailService['getEmailTemplate'] ? (this.emailService as any).getEmailTemplate(content) : content,
      });
    } catch (err) {
      console.error('[AdminService][updatePassword] Email send error:', err);
    }

    return {
      message: 'Password updated successfully',
    };
  }

  async sendPasswordOtp(email: string) {
    let user: schema.User | undefined;
    try {
      user = await this.db.query.users.findFirst({ where: eq(schema.users.email, email) });
    } catch (err) {
      console.error('[AdminService][sendPasswordOtp] DB query error:', err);
      throw new InternalServerErrorException('Database error while fetching admin');
    }

    if (!user || !user.role || user.role.toLowerCase() !== 'admin') {
      return { message: 'If an account exists for this email, an OTP has been sent' };
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = this.hashOtp(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    try {
      await this.db.insert(schema.passwordResetOtps).values({
        email: user.email,
        otp_hash: otpHash,
        expires_at: expiresAt,
      });
    } catch (err) {
      console.error('[AdminService][sendPasswordOtp] DB update error:', err);
      throw new InternalServerErrorException('Database error while storing OTP');
    }

    // send email with OTP
    const content = `
      <div class="email-content">
        <p>Hi ${user.first_name},</p>
        <p>Use the following One-Time Password (OTP) to reset your password. It expires in 10 minutes.</p>
        <div class="info-box">
          <p style="font-size: 20px; font-weight: 700;">${otp}</p>
        </div>
        <p>If you did not request this, please ignore this email.</p>
        <p style="margin-top:20px;">Best regards,<br/><strong style="color: #7F435F;">The Fitness Coaching Team</strong></p>
      </div>
    `;

    try {
      await this.emailService.sendCustomEmail({
        to: user.email,
        subject: 'Your Password Reset OTP - Fitness Coaching',
        htmlContent: this.emailService['getEmailTemplate'] ? (this.emailService as any).getEmailTemplate(content) : content,
      });
    } catch (err) {
      console.error('[AdminService][sendPasswordOtp] Email send error:', err);
    }

    return { message: 'If an account exists for this email, an OTP has been sent' };
  }

  async confirmPasswordOtp(email: string, otp: string) {
    const user = await this.db.query.users.findFirst({ where: eq(schema.users.email, email) });
    if (!user || !user.role || user.role.toLowerCase() !== 'admin') {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const otpRecords = await this.db
      .select()
      .from(schema.passwordResetOtps)
      .where(
        and(
          eq(schema.passwordResetOtps.email, email),
          eq(schema.passwordResetOtps.is_used, false),
        ),
      )
      .orderBy(schema.passwordResetOtps.created_at);

    if (otpRecords.length === 0) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const otpRecord = otpRecords[otpRecords.length - 1];

    if (new Date() > otpRecord.expires_at) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const attempts = otpRecord.attempts || 0;
    if (attempts >= 5) {
      throw new BadRequestException('Too many attempts. Please request a new OTP.');
    }

    const otpHash = this.hashOtp(otp);
    if (otpHash !== otpRecord.otp_hash) {
      await this.db
        .update(schema.passwordResetOtps)
        .set({ attempts: attempts + 1 })
        .where(eq(schema.passwordResetOtps.id, otpRecord.id));
      throw new BadRequestException('Invalid or expired OTP');
    }

    // generate a one-time reset token and store it
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    try {
      await this.db.insert(schema.passwordResetTokens).values({
        email,
        token: resetToken,
        associated_otp_id: otpRecord.id,
        expires_at: tokenExpiresAt,
      });
    } catch (err) {
      console.error('[AdminService][confirmPasswordOtp] DB error:', err);
      throw new InternalServerErrorException('Database error while creating reset token');
    }

    return { message: 'OTP confirmed', resetToken };
  }

  async resetPassword(email: string, resetToken: string, newPassword: string) {
    const tokenRecord = await this.db.query.passwordResetTokens.findFirst({
      where: and(
        eq(schema.passwordResetTokens.email, email),
        eq(schema.passwordResetTokens.token, resetToken),
        eq(schema.passwordResetTokens.is_used, false),
      ),
    });

    if (!tokenRecord) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (new Date() > tokenRecord.expires_at) {
      throw new BadRequestException('Reset token has expired');
    }

    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });

    if (!user || !user.role || user.role.toLowerCase() !== 'admin') {
      throw new BadRequestException('Admin account not found');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    try {
      await this.db.update(schema.users).set({
        password_hash: passwordHash,
        updated_at: new Date(),
      }).where(eq(schema.users.user_id, user.user_id));

      await this.db
        .update(schema.passwordResetTokens)
        .set({ is_used: true })
        .where(eq(schema.passwordResetTokens.id, tokenRecord.id));

      if (tokenRecord.associated_otp_id) {
        await this.db
          .update(schema.passwordResetOtps)
          .set({ is_used: true })
          .where(eq(schema.passwordResetOtps.id, tokenRecord.associated_otp_id));
      }
    } catch (err) {
      console.error('[AdminService][resetPassword] DB update error:', err);
      throw new InternalServerErrorException('Database error while resetting password');
    }

    // send notification email
    const content = `
      <div class="email-content">
        <p>Hi ${user.first_name},</p>
        <p>Your admin account password has been reset successfully.</p>
        <p>If you did not request this change, please contact support immediately.</p>
        <p style="margin-top:20px;">Best regards,<br/><strong style="color: #7F435F;">The Fitness Coaching Team</strong></p>
      </div>
    `;

    try {
      await this.emailService.sendCustomEmail({
        to: user.email,
        subject: 'Your Password Has Been Reset - Fitness Coaching',
        htmlContent: this.emailService['getEmailTemplate'] ? (this.emailService as any).getEmailTemplate(content) : content,
      });
    } catch (err) {
      console.error('[AdminService][resetPassword] Email send error:', err);
    }

    return { message: 'Password reset successfully' };
  }

  async listAdmins(query: AdminQueryDto) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 10;
    const offset = (page - 1) * pageSize;

    // Build filter SQL - only fetch users where role is admin
    let whereSql = sql`LOWER("role") = 'admin'`;
    if (query.search && query.search.trim().length > 0) {
      const s = `%${query.search.trim()}%`;
      whereSql = sql`
        ${whereSql} AND ("first_name" ILIKE ${s} OR "last_name" ILIKE ${s} OR "email" ILIKE ${s})
      `;
    }

    try {
      // total count
      const countRes = await this.db.execute(sql`SELECT COUNT(*)::int AS count FROM users WHERE ${whereSql}`);
      const total = (countRes.rows && countRes.rows[0] && Number(countRes.rows[0].count)) || 0;

      // fetch page
      const res = await this.db.execute(sql`
        SELECT user_id AS admin_id, user_id, email, phone_number, country_code, first_name, last_name, role, status, last_login, created_at, updated_at
        FROM users
        WHERE ${whereSql}
        ORDER BY created_at DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `);

      const data = res.rows;

      return {
        data,
        meta: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (err) {
      console.error('[AdminService][listAdmins] DB error:', err);
      throw new InternalServerErrorException('Database error while listing admins');
    }
  }
}
