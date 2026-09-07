import { Injectable, Inject, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import * as schema from '../database/schema';
import { DATABASE_CONNECTION } from '../database/database.module';
import { EmailService } from '../email/email.service';
import { EmployeeRegisterDto } from './dto/employee-register.dto';
import { UserRole } from '../common/enums/roles.enum';
import * as crypto from 'crypto';

@Injectable()
export class EmployeeService {
    constructor(
        @Inject(DATABASE_CONNECTION) private readonly db: NodePgDatabase<typeof schema>,
        private readonly configService: ConfigService,
        private readonly emailService: EmailService,
    ) { }

    private generateTemporaryPassword(length = 10): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < length; i++) {
            const randomIndex = crypto.randomInt(0, chars.length);
            password += chars[randomIndex];
        }
        return password;
    }

    async register(dto: EmployeeRegisterDto) {
        // 1. Check existing user by email
        let existingUser: schema.User | undefined;
        try {
            existingUser = await this.db.query.users.findFirst({
                where: eq(schema.users.email, dto.work_email),
            });
        } catch (err) {
            console.error('[EmployeeService][register] DB query error while checking existing user:', err);
            throw new InternalServerErrorException('Database error while checking existing email');
        }

        if (existingUser) {
            throw new BadRequestException('User with this work email already exists');
        }

        const plainPassword = this.generateTemporaryPassword(10);
        const passwordHash = await bcrypt.hash(plainPassword, 10);

        // 3. Execute DB Transaction
        let result: { user: schema.User; employee: any };
        try {
            result = await this.db.transaction(async (tx) => {
                // A. Create User Record
                const userRes = await tx
                    .insert(schema.users)
                    .values({
                        email: dto.work_email,
                        password_hash: passwordHash,
                        first_name: dto.first_name,
                        last_name: dto.last_name,
                        phone_number: dto.mobile_no || null,
                        role: dto.role || UserRole.EMPLOYEE,
                        status: 'Active',
                        email_verified: true,
                    })
                    .returning();
                const createdUser = userRes[0];

                // B. Create Employee Profile Record
                const employeeRes = await tx
                    .insert(schema.employees)
                    .values({
                        user_id: createdUser.user_id,
                        epf_no: dto.epf_no,
                        first_name: dto.first_name,
                        last_name: dto.last_name,
                        dob: dto.dob,
                        join_date: dto.join_date,
                        work_email: dto.work_email,
                        personal_email: dto.personal_email || null,
                        mobile_no: dto.mobile_no || null,
                        home_tp: dto.home_tp || null,
                        street: dto.street || null,
                        city: dto.city || null,
                        province: dto.province || null,
                        country: dto.country || null,
                        department_id: dto.department_id || null,
                        position_id: dto.position_id || null,
                        supervisor_id: dto.supervisor_id || null,
                    })
                    .returning();
                const createdEmployee = employeeRes[0];

                // C. Insert Emergency Contacts (if provided)
                if (dto.emergency_contacts && dto.emergency_contacts.length > 0) {
                    await tx.insert(schema.empEmergencyContacts).values(
                        dto.emergency_contacts.map((contact) => ({
                            employee_id: createdEmployee.employee_id,
                            name: contact.name,
                            relationship: contact.relationship,
                            mobile: contact.mobile,
                            home_tp: contact.home_tp || null,
                            work_tp: contact.work_tp || null,
                        })),
                    );
                }

                // D. Insert Qualifications (if provided)
                if (dto.qualifications && dto.qualifications.length > 0) {
                    await tx.insert(schema.empQualifications).values(
                        dto.qualifications.map((qual) => ({
                            employee_id: createdEmployee.employee_id,
                            qualification_title: qual.qualification_title,
                            institute: qual.institute || null,
                            completed_year: qual.completed_year || null,
                        })),
                    );
                }

                // E. Insert Dependents (if provided)
                if (dto.dependents && dto.dependents.length > 0) {
                    await tx.insert(schema.empDependents).values(
                        dto.dependents.map((dep) => ({
                            employee_id: createdEmployee.employee_id,
                            name: dep.name,
                            relationship: dep.relationship,
                            dob: dep.dob || null,
                            mobile: dep.mobile || null,
                        })),
                    );
                }

                return { user: createdUser, employee: createdEmployee };
            });
        } catch (err) {
            console.error('[EmployeeService][register] Transaction error:', err);
            throw new InternalServerErrorException('Failed to complete employee registration process');
        }

        // 4. Send Credentials Email to Employee
        const emailContent = `
      <div class="email-content">
        <p>Hi ${result.user.first_name},</p>
        <p>Welcome to the team! Your employee account has been created.</p>
        <div class="info-box" style="background:#f4f4f4; padding:15px; border-radius:5px; margin:15px 0;">
          <p><strong>Login Credentials</strong></p>
          <p>EPF No: <strong>${result.employee.epf_no}</strong></p>
          <p>Email: <strong>${result.user.email}</strong></p>
          <p>Temporary Password: <strong>${plainPassword}</strong></p>
        </div>
        <p>Please log in and update your password immediately.</p>
        <p style="margin-top:20px;">Best regards,<br/><strong>HR Department</strong></p>
      </div>
    `;

        try {
            await this.emailService.sendCustomEmail({
                to: result.user.email,
                subject: 'Welcome to the Company - Account Credentials',
                htmlContent: this.emailService['getEmailTemplate']
                    ? (this.emailService as any).getEmailTemplate(emailContent)
                    : emailContent,
            });
        } catch (emailErr) {
            console.error('[EmployeeService][register] Email sending error:', emailErr);
        }

        return {
            message: 'Employee registered successfully',
            employeeId: result.employee.employee_id,
            userId: result.user.user_id,
            epfNo: result.employee.epf_no,
        };
    }
}