import { Injectable, UnauthorizedException, Inject, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, sql } from 'drizzle-orm';
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

  private generateTokens(admin: schema.Admin, rememberMe: boolean = false) {
    const payload = { sub: admin.admin_id, email: admin.email };
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
    let admin: schema.Admin | undefined;
    try {
      admin = await this.db.query.admins.findFirst({ where: eq(schema.admins.email, email) });
    } catch (err) {
      console.error('[AdminService][login] DB query error:', err);
      throw new InternalServerErrorException('Database error while fetching admin');
    }
    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // NOTE: password stored in plain text as requested
    if (admin.password !== password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.db.update(schema.admins).set({ last_login: new Date() }).where(eq(schema.admins.admin_id, admin.admin_id));

    const tokens = this.generateTokens(admin, rememberMe);

    return {
      ...tokens,
      admin: {
        adminId: admin.admin_id,
        email: admin.email,
        firstName: admin.first_name,
        lastName: admin.last_name,
        phoneNumber: admin.phone_number,
        countryCode: admin.country_code,
        lastLogin: admin.last_login,
      },
    };
  }

  async register(dto: AdminRegisterDto) {
    // check existing
    let existing: schema.Admin | undefined;
    try {
      existing = await this.db.query.admins.findFirst({ where: eq(schema.admins.email, dto.email) });
    } catch (err) {
      console.error('[AdminService][register] DB query error while checking existing admin:', err);
      throw new InternalServerErrorException('Database error while checking existing admin');
    }

    if (existing) {
      throw new BadRequestException('Admin with this email already exists');
    }

    // insert admin (password stored in plain text per request)
    let created: schema.Admin;
    try {
      const res = await this.db.insert(schema.admins).values({
        email: dto.email,
        password: dto.password,
        phone_number: dto.phoneNumber || null,
        country_code: dto.countryCode || null,
        first_name: dto.firstName,
        last_name: dto.lastName,
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
      adminId: created.admin_id,
      email: created.email,
    };
  }

  async updateDetails(adminId: string, dto: AdminUpdateDto) {
    // find admin
    let admin: schema.Admin | undefined;
    try {
      admin = await this.db.query.admins.findFirst({ where: eq(schema.admins.admin_id, adminId) });
    } catch (err) {
      console.error('[AdminService][updateDetails] DB query error:', err);
      throw new InternalServerErrorException('Database error while fetching admin');
    }
    if (!admin) {
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
      await this.db.update(schema.admins).set(updateData).where(eq(schema.admins.admin_id, adminId));
    } catch (err) {
      console.error('[AdminService][updateDetails] DB update error:', err);
      throw new InternalServerErrorException('Database error while updating admin');
    }

    const updated = await this.db.query.admins.findFirst({ where: eq(schema.admins.admin_id, adminId) });
    return {
      message: 'Admin updated successfully',
      admin: {
        adminId: updated!.admin_id,
        email: updated!.email,
        firstName: updated!.first_name,
        lastName: updated!.last_name,
        phoneNumber: updated!.phone_number,
        countryCode: updated!.country_code,
        lastLogin: updated!.last_login,
      },
    };
  }

  async updatePassword(adminId: string, dto: AdminUpdatePasswordDto) {
    // find admin
    let admin: schema.Admin | undefined;
    try {
      admin = await this.db.query.admins.findFirst({ where: eq(schema.admins.admin_id, adminId) });
    } catch (err) {
      console.error('[AdminService][updatePassword] DB query error:', err);
      throw new InternalServerErrorException('Database error while fetching admin');
    }
    if (!admin) {
      throw new BadRequestException('Admin not found');
    }

    // Update password (plain text as requested)
    try {
      await this.db.update(schema.admins).set({ password: dto.newPassword, updated_at: new Date() }).where(eq(schema.admins.admin_id, adminId));
    } catch (err) {
      console.error('[AdminService][updatePassword] DB update error:', err);
      throw new InternalServerErrorException('Database error while updating password');
    }

    // Send email with new password
    const content = `
      <div class="email-content">
        <p>Hi ${admin.first_name},</p>
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
        to: admin.email,
        subject: 'Your Admin Account Password Has Been Updated - Fitness Coaching',
        htmlContent: this.emailService['getEmailTemplate'] ? (this.emailService as any).getEmailTemplate(content) : content,
      });
    } catch (err) {
      console.error('[AdminService][updatePassword] Email send error:', err);
      // do not fail the request if email sending fails
    }

    return {
      message: 'Password updated successfully',
    };
  }

  async sendPasswordOtp(email: string) {
    // find admin
    let admin: schema.Admin | undefined;
    try {
      admin = await this.db.query.admins.findFirst({ where: eq(schema.admins.email, email) });
    } catch (err) {
      console.error('[AdminService][sendPasswordOtp] DB query error:', err);
      throw new InternalServerErrorException('Database error while fetching admin');
    }

    if (!admin) {
      // For security, don't reveal that email doesn't exist
      return { message: 'If an account exists for this email, an OTP has been sent' };
    }

    // generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    try {
      await this.db.update(schema.admins).set({
        password_reset_otp: otp,
        password_reset_otp_expires_at: expiresAt,
        updated_at: new Date(),
      }).where(eq(schema.admins.admin_id, admin.admin_id));
    } catch (err) {
      console.error('[AdminService][sendPasswordOtp] DB update error:', err);
      throw new InternalServerErrorException('Database error while storing OTP');
    }

    // send email with OTP
    const content = `
      <div class="email-content">
        <p>Hi ${admin.first_name},</p>
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
        to: admin.email,
        subject: 'Your Password Reset OTP - Fitness Coaching',
        htmlContent: this.emailService['getEmailTemplate'] ? (this.emailService as any).getEmailTemplate(content) : content,
      });
    } catch (err) {
      console.error('[AdminService][sendPasswordOtp] Email send error:', err);
      // don't fail the flow if email fails - still return generic message
    }

    return { message: 'If an account exists for this email, an OTP has been sent' };
  }

  async confirmPasswordOtp(email: string, otp: string) {
    let admin: schema.Admin | undefined;
    try {
      admin = await this.db.query.admins.findFirst({ where: eq(schema.admins.email, email) });
    } catch (err) {
      console.error('[AdminService][confirmPasswordOtp] DB query error:', err);
      throw new InternalServerErrorException('Database error while fetching admin');
    }

    if (!admin || !admin.password_reset_otp || !admin.password_reset_otp_expires_at) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const now = new Date();
    if (admin.password_reset_otp !== otp || new Date(admin.password_reset_otp_expires_at) < now) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    // generate a one-time reset token and store it, clear otp
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    try {
      await this.db.update(schema.admins).set({
        password_reset_otp: null,
        password_reset_otp_expires_at: null,
        password_reset_token: resetToken,
        password_reset_token_expires_at: tokenExpiresAt,
        updated_at: new Date(),
      }).where(eq(schema.admins.admin_id, admin.admin_id));
    } catch (err) {
      console.error('[AdminService][confirmPasswordOtp] DB update error:', err);
      throw new InternalServerErrorException('Database error while creating reset token');
    }

    // return reset token to client (short lived)
    return { message: 'OTP confirmed', resetToken };
  }

  async resetPassword(email: string, resetToken: string, newPassword: string) {
    let admin: schema.Admin | undefined;
    try {
      admin = await this.db.query.admins.findFirst({ where: eq(schema.admins.email, email) });
    } catch (err) {
      console.error('[AdminService][resetPassword] DB query error:', err);
      throw new InternalServerErrorException('Database error while fetching admin');
    }

    if (!admin || !admin.password_reset_token || !admin.password_reset_token_expires_at) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const now = new Date();
    if (admin.password_reset_token !== resetToken || new Date(admin.password_reset_token_expires_at) < now) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Update password and clear token
    try {
      await this.db.update(schema.admins).set({
        password: newPassword,
        password_reset_token: null,
        password_reset_token_expires_at: null,
        updated_at: new Date(),
      }).where(eq(schema.admins.admin_id, admin.admin_id));
    } catch (err) {
      console.error('[AdminService][resetPassword] DB update error:', err);
      throw new InternalServerErrorException('Database error while resetting password');
    }

    // send notification email
    const content = `
      <div class="email-content">
        <p>Hi ${admin.first_name},</p>
        <p>Your admin account password has been reset successfully.</p>
        <p>If you did not request this change, please contact support immediately.</p>
        <p style="margin-top:20px;">Best regards,<br/><strong style="color: #7F435F;">The Fitness Coaching Team</strong></p>
      </div>
    `;

    try {
      await this.emailService.sendCustomEmail({
        to: admin.email,
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

    // Build filter SQL
    let whereSql = sql`TRUE`;
    if (query.search && query.search.trim().length > 0) {
      const s = `%${query.search.trim()}%`;
      whereSql = sql`
        ("first_name" ILIKE ${s} OR "last_name" ILIKE ${s} OR "email" ILIKE ${s})
      `;
    }

    try {
      // total count
      const countRes = await this.db.execute(sql`SELECT COUNT(*)::int AS count FROM admins WHERE ${whereSql}`);
      const total = (countRes.rows && countRes.rows[0] && Number(countRes.rows[0].count)) || 0;

      // fetch page
      const res = await this.db.execute(sql`
        SELECT admin_id, email, phone_number, country_code, first_name, last_name, last_login, created_at, updated_at
        FROM admins
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
