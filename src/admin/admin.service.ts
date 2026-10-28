import { Injectable, UnauthorizedException, Inject, BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, sql, and, or, count, desc, ilike, SQL, isNull } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import * as schema from '../database/schema';
import { getAppName } from '../common/app-name';
import { DATABASE_CONNECTION } from '../database/database.module';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AdminRegisterDto } from './dto/admin-register.dto';
import { AdminUpdateDto } from './dto/admin-update.dto';
import { AdminUpdatePasswordDto } from './dto/admin-update-password.dto';
import { AdminQueryDto } from './dto/admin-query.dto';
import { AdminEmployeeRequestQueryDto } from './dto/admin-employee-request-query.dto';
import { generateEmployeeNo } from '../common/utils/code-generator.util';

@Injectable()
export class AdminService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: NodePgDatabase<typeof schema>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly notificationsService: NotificationsService,
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
        <p>Your admin account has been created for <strong>${getAppName(this.configService)}</strong>.</p>
        <div class="info-box">
          <p><strong>Credentials</strong></p>
          <p>Email: <strong>${created.email}</strong></p>
          <p>Password: <strong>${dto.password}</strong></p>
        </div>
        <p>Please change your password after your first login.</p>
        <p style="margin-top:20px;">Best regards,<br/><strong style="color: #7F435F;">The ${getAppName(this.configService)} Team</strong></p>
      </div>
    `;

    await this.emailService.sendCustomEmail({
      to: created.email,
      subject: `Your Admin Account - ${getAppName(this.configService)}`,
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
        <p style="margin-top:20px;">Best regards,<br/><strong style="color: #7F435F;">The ${getAppName(this.configService)} Team</strong></p>
      </div>
    `;

    try {
      await this.emailService.sendCustomEmail({
        to: user.email,
        subject: `Your Admin Account Password Has Been Updated - ${getAppName(this.configService)}`,
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
        is_used: false,
        attempts: 0,
        created_at: new Date(),
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
        <p style="margin-top:20px;">Best regards,<br/><strong style="color: #7F435F;">The ${getAppName(this.configService)} Team</strong></p>
      </div>
    `;

    try {
      await this.emailService.sendCustomEmail({
        to: user.email,
        subject: `Your Password Reset OTP - ${getAppName(this.configService)}`,
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
          or(
            eq(schema.passwordResetOtps.is_used, false),
            isNull(schema.passwordResetOtps.is_used),
          ),
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
        is_used: false,
        created_at: new Date(),
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
        or(
          eq(schema.passwordResetTokens.is_used, false),
          isNull(schema.passwordResetTokens.is_used),
        ),
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
        <p style="margin-top:20px;">Best regards,<br/><strong style="color: #7F435F;">The ${getAppName(this.configService)} Team</strong></p>
      </div>
    `;

    try {
      await this.emailService.sendCustomEmail({
        to: user.email,
        subject: `Your Password Has Been Reset - ${getAppName(this.configService)}`,
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

  private generateTemporaryEmployeePassword(length = 10): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, chars.length);
      password += chars[randomIndex];
    }
    return password;
  }

  async listEmployeeRequests(query: AdminEmployeeRequestQueryDto) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 10;
    const offset = (page - 1) * pageSize;

    try {
      const conditions: SQL[] = [];

      if (query.status && query.status.trim().length > 0) {
        conditions.push(eq(schema.employeeAccountRequests.status, query.status.toUpperCase()));
      }

      if (query.search && query.search.trim().length > 0) {
        const pattern = `%${query.search.trim()}%`;
        conditions.push(
          or(
            ilike(schema.employeeAccountRequests.employee_no, pattern),
            ilike(schema.employeeAccountRequests.first_name, pattern),
            ilike(schema.employeeAccountRequests.last_name, pattern),
            ilike(schema.employeeAccountRequests.epf_no, pattern),
            ilike(schema.employeeAccountRequests.work_email, pattern),
          )!,
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [{ totalCount }] = await this.db
        .select({ totalCount: count() })
        .from(schema.employeeAccountRequests)
        .where(whereClause);

      const total = Number(totalCount) || 0;

      const rows = await this.db
        .select({
          request: schema.employeeAccountRequests,
          department: {
            department_id: schema.departments.departmentId,
            department_code: schema.departments.departmentCode,
            department_name: schema.departments.departmentName,
            location: schema.departments.location,
          },
          position: {
            position_id: schema.positions.position_id,
            position_code: schema.positions.position_code,
            position_name: schema.positions.position_name,
          },
          requestedBy: {
            user_id: schema.users.user_id,
            first_name: schema.users.first_name,
            last_name: schema.users.last_name,
            email: schema.users.email,
          },
          reviewedBy: {
            user_id: schema.users.user_id,
            first_name: schema.users.first_name,
            last_name: schema.users.last_name,
            email: schema.users.email,
          },
        })
        .from(schema.employeeAccountRequests)
        .leftJoin(
          schema.departments,
          eq(schema.employeeAccountRequests.departmentId, schema.departments.departmentId),
        )
        .leftJoin(
          schema.positions,
          eq(schema.employeeAccountRequests.position_id, schema.positions.position_id),
        )
        .leftJoin(
          schema.users,
          eq(schema.employeeAccountRequests.requested_by, schema.users.user_id),
        )
        .where(whereClause)
        .orderBy(desc(schema.employeeAccountRequests.created_at))
        .limit(pageSize)
        .offset(offset);

      const data = rows.map((r) => ({
        ...r.request,
        department: r.department?.department_id ? r.department : null,
        position: r.position?.position_id ? r.position : null,
        requestedBy: r.requestedBy?.user_id ? r.requestedBy : null,
      }));

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
      console.error('[AdminService][listEmployeeRequests] DB error:', err);
      throw new InternalServerErrorException('Database error while listing employee requests');
    }
  }

  async getEmployeeRequestById(id: string) {
    try {
      const rows = await this.db
        .select({
          request: schema.employeeAccountRequests,
          department: {
            department_id: schema.departments.departmentId,
            department_code: schema.departments.departmentCode,
            department_name: schema.departments.departmentName,
            location: schema.departments.location,
            dept_phone: schema.departments.deptPhone,
          },
          position: {
            position_id: schema.positions.position_id,
            position_code: schema.positions.position_code,
            position_name: schema.positions.position_name,
            description: schema.positions.description,
          },
          requestedBy: {
            user_id: schema.users.user_id,
            first_name: schema.users.first_name,
            last_name: schema.users.last_name,
            email: schema.users.email,
            role: schema.users.role,
          },
        })
        .from(schema.employeeAccountRequests)
        .leftJoin(
          schema.departments,
          eq(schema.employeeAccountRequests.departmentId, schema.departments.departmentId),
        )
        .leftJoin(
          schema.positions,
          eq(schema.employeeAccountRequests.position_id, schema.positions.position_id),
        )
        .leftJoin(
          schema.users,
          eq(schema.employeeAccountRequests.requested_by, schema.users.user_id),
        )
        .where(eq(schema.employeeAccountRequests.id, id));

      if (!rows || rows.length === 0) {
        throw new NotFoundException('Employee account request not found');
      }

      const row = rows[0];
      return {
        ...row.request,
        department: row.department?.department_id ? row.department : null,
        position: row.position?.position_id ? row.position : null,
        requestedBy: row.requestedBy?.user_id ? row.requestedBy : null,
      };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      console.error('[AdminService][getEmployeeRequestById] DB error:', err);
      throw new InternalServerErrorException('Database error while fetching employee request');
    }
  }

  async acceptEmployeeRequest(id: string, adminUserId: string) {
    const request = await this.db.query.employeeAccountRequests.findFirst({
      where: eq(schema.employeeAccountRequests.id, id),
    });

    if (!request) {
      throw new NotFoundException('Employee account request not found');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException(`Request cannot be accepted because it is already ${request.status}`);
    }

    // Check existing user by email
    const existingUser = await this.db.query.users.findFirst({
      where: eq(schema.users.email, request.work_email),
    });
    if (existingUser) {
      throw new BadRequestException('A user with this work email already exists');
    }

    // Check existing employee by EPF
    const existingEmployee = await this.db.query.employees.findFirst({
      where: eq(schema.employees.epf_no, request.epf_no),
    });
    if (existingEmployee) {
      throw new BadRequestException('An employee with this EPF number already exists');
    }

    // Check or generate readable Employee No (EMP-0001, etc.)
    let employeeNo = request.employee_no?.trim();
    if (employeeNo) {
      const existingEmpNo = await this.db.query.employees.findFirst({
        where: eq(schema.employees.employee_no, employeeNo),
      });
      if (existingEmpNo) {
        employeeNo = await generateEmployeeNo(this.db);
      }
    } else {
      employeeNo = await generateEmployeeNo(this.db);
    }

    const plainPassword = this.generateTemporaryEmployeePassword(10);
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    let result: { user: schema.User; employee: schema.Employee };
    try {
      result = await this.db.transaction(async (tx) => {
        // 1. Create User
        const userRes = await tx
          .insert(schema.users)
          .values({
            email: request.work_email,
            password_hash: passwordHash,
            first_name: request.first_name,
            last_name: request.last_name,
            phone_number: request.mobile_no || null,
            role: request.role || 'employee',
            status: 'Active',
            email_verified: true,
          })
          .returning();
        const createdUser = userRes[0];

        // 2. Create Employee
        const employeeRes = await tx
          .insert(schema.employees)
          .values({
            user_id: createdUser.user_id,
            employee_no: employeeNo,
            epf_no: request.epf_no,
            first_name: request.first_name,
            last_name: request.last_name,
            dob: request.dob,
            join_date: request.join_date,
            work_email: request.work_email,
            personal_email: request.personal_email || null,
            mobile_no: request.mobile_no || null,
            home_tp: request.home_tp || null,
            street: request.street || null,
            city: request.city || null,
            province: request.province || null,
            country: request.country || null,
            departmentId: request.departmentId || null,
            position_id: request.position_id || null,
            supervisor_id: request.supervisor_id || null,
          })
          .returning();
        const createdEmployee = employeeRes[0];

        // 3. Update department count
        if (request.departmentId) {
          await tx
            .update(schema.departments)
            .set({
              noOfEmployees: sql`COALESCE(${schema.departments.noOfEmployees}, 0) + 1`,
            })
            .where(eq(schema.departments.departmentId, request.departmentId));
        }

        // 4. Insert emergency contacts if provided
        const emergencyContacts = request.emergency_contacts as any[];
        if (Array.isArray(emergencyContacts) && emergencyContacts.length > 0) {
          await tx.insert(schema.empEmergencyContacts).values(
            emergencyContacts.map((contact) => ({
              employee_id: createdEmployee.employee_id,
              name: contact.name,
              relationship: contact.relationship,
              mobile: contact.mobile,
              home_tp: contact.home_tp || null,
              work_tp: contact.work_tp || null,
            })),
          );
        }

        // 5. Insert qualifications if provided
        const qualifications = request.qualifications as any[];
        if (Array.isArray(qualifications) && qualifications.length > 0) {
          await tx.insert(schema.empQualifications).values(
            qualifications.map((qual) => ({
              employee_id: createdEmployee.employee_id,
              qualification_title: qual.qualification_title,
              institute: qual.institute || null,
              completed_year: qual.completed_year || null,
            })),
          );
        }

        // 6. Insert dependents if provided
        const dependents = request.dependents as any[];
        if (Array.isArray(dependents) && dependents.length > 0) {
          await tx.insert(schema.empDependents).values(
            dependents.map((dep) => ({
              employee_id: createdEmployee.employee_id,
              name: dep.name,
              relationship: dep.relationship,
              dob: dep.dob || null,
              mobile: dep.mobile || null,
            })),
          );
        }

        // 7. Update request status to APPROVED
        await tx
          .update(schema.employeeAccountRequests)
          .set({
            status: 'APPROVED',
            reviewed_by: adminUserId || null,
            reviewed_at: new Date(),
            updated_at: new Date(),
          })
          .where(eq(schema.employeeAccountRequests.id, id));

        return { user: createdUser, employee: createdEmployee };
      });
    } catch (err) {
      console.error('[AdminService][acceptEmployeeRequest] Transaction error:', err);
      throw new InternalServerErrorException('Failed to process employee account approval');
    }

    // 8. Send credentials email to employee
    const emailContent = `
      <div class="email-content">
        <p>Hi ${result.user.first_name},</p>
        <p>Your employee account has been approved and created.</p>
        <div class="info-box" style="background:#f4f4f4; padding:15px; border-radius:5px; margin:15px 0;">
          <p><strong>Login Credentials</strong></p>
          <p>Employee No: <strong>${result.employee.employee_no}</strong></p>
          <p>EPF No: <strong>${result.employee.epf_no}</strong></p>
          <p>Email: <strong>${result.user.email}</strong></p>
          <p>Temporary Password: <strong>${plainPassword}</strong></p>
        </div>
        <p>Please log in and update your password immediately.</p>
        <p style="margin-top:20px;">Best regards,<br/><strong>Administration Team</strong></p>
      </div>
    `;

    try {
      await this.emailService.sendCustomEmail({
        to: result.user.email,
        subject: 'Employee Account Approved - Login Credentials',
        htmlContent: this.emailService['getEmailTemplate']
          ? (this.emailService as any).getEmailTemplate(emailContent)
          : emailContent,
      });
    } catch (emailErr) {
      console.error('[AdminService][acceptEmployeeRequest] Email error:', emailErr);
    }

    // 9. Send notification to HR requester
    if (request.requested_by) {
      try {
        await this.notificationsService.create({
          recipient_id: request.requested_by,
          title: 'Employee Request Approved',
          message: `The employee account request for ${request.first_name} ${request.last_name} (${result.employee.employee_no || request.epf_no}) has been approved by Admin.`,
          type: 'REQUEST_APPROVED',
          data: {
            requestId: request.id,
            employeeId: result.employee.employee_id,
            employeeNo: result.employee.employee_no,
            userId: result.user.user_id,
            epfNo: request.epf_no,
            reviewedBy: adminUserId,
          },
        });
      } catch (notifyErr) {
        console.error('[AdminService][acceptEmployeeRequest] Notification error:', notifyErr);
      }
    }

    return {
      message: 'Employee request accepted and employee account created successfully',
      employeeId: result.employee.employee_id,
      employeeNo: result.employee.employee_no,
      userId: result.user.user_id,
      epfNo: result.employee.epf_no,
    };
  }

  async rejectEmployeeRequest(id: string, adminUserId: string, reason?: string) {
    const request = await this.db.query.employeeAccountRequests.findFirst({
      where: eq(schema.employeeAccountRequests.id, id),
    });

    if (!request) {
      throw new NotFoundException('Employee account request not found');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException(`Request cannot be rejected because it is already ${request.status}`);
    }

    try {
      await this.db
        .update(schema.employeeAccountRequests)
        .set({
          status: 'REJECTED',
          rejection_reason: reason || null,
          reviewed_by: adminUserId || null,
          reviewed_at: new Date(),
          updated_at: new Date(),
        })
        .where(eq(schema.employeeAccountRequests.id, id));
    } catch (err) {
      console.error('[AdminService][rejectEmployeeRequest] DB error:', err);
      throw new InternalServerErrorException('Failed to reject employee request');
    }

    // Notify HR requester
    if (request.requested_by) {
      try {
        await this.notificationsService.create({
          recipient_id: request.requested_by,
          title: 'Employee Request Rejected',
          message: `The employee account request for ${request.first_name} ${request.last_name} was rejected by Admin.${reason ? ` Reason: ${reason}` : ''}`,
          type: 'REQUEST_REJECTED',
          data: {
            requestId: request.id,
            reason: reason || null,
            reviewedBy: adminUserId,
          },
        });
      } catch (notifyErr) {
        console.error('[AdminService][rejectEmployeeRequest] Notification error:', notifyErr);
      }
    }

    return {
      message: 'Employee account request rejected successfully',
      requestId: id,
      status: 'REJECTED',
      reason: reason || null,
    };
  }
}

