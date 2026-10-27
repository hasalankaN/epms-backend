import { Injectable, Inject, BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, or, and, ilike, count, desc, inArray, sql, SQL, aliasedTable } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import * as schema from '../database/schema';
import { DATABASE_CONNECTION } from '../database/database.module';
import { EmailService } from '../email/email.service';
import { EmployeeRegisterDto } from './dto/employee-register.dto';
import { EmployeeQueryDto } from './dto/employee-query.dto';
import { SupervisorQueryDto } from './dto/supervisor-query.dto';
import { UserRole } from '../common/enums/roles.enum';
import { generateEmployeeNo } from '../common/utils/code-generator.util';
import * as crypto from 'crypto';

@Injectable()
export class EmployeeService {
    constructor(
        @Inject(DATABASE_CONNECTION) private readonly db: NodePgDatabase<typeof schema>,
        private readonly configService: ConfigService,
        private readonly emailService: EmailService,
    ) { }

    public generateTemporaryPassword(length = 10): string {
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

        // 2. Check existing employee by EPF
        const existingEmployee = await this.db.query.employees.findFirst({
            where: eq(schema.employees.epf_no, dto.epf_no),
        });
        if (existingEmployee) {
            throw new BadRequestException('Employee with this EPF number already exists');
        }

        // 3. Check or generate readable Employee No (EMP-0001, etc.)
        let employeeNo = dto.employee_no?.trim();
        if (employeeNo) {
            const existingEmpNo = await this.db.query.employees.findFirst({
                where: eq(schema.employees.employee_no, employeeNo),
            });
            if (existingEmpNo) {
                throw new BadRequestException('Employee with this Employee Number already exists');
            }
        } else {
            employeeNo = await generateEmployeeNo(this.db);
        }

        const plainPassword = this.generateTemporaryPassword(10);
        const passwordHash = await bcrypt.hash(plainPassword, 10);

        // 4. Execute DB Transaction
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
                        employee_no: employeeNo,
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
                        departmentId: dto.department_id || null,
                        position_id: dto.position_id || null,
                        supervisor_id: dto.supervisor_id || null,
                    })
                    .returning();
                const createdEmployee = employeeRes[0];

                // Increment department employee count if department provided
                if (dto.department_id) {
                    await tx
                        .update(schema.departments)
                        .set({
                            noOfEmployees: sql`COALESCE(${schema.departments.noOfEmployees}, 0) + 1`,
                        })
                        .where(eq(schema.departments.departmentId, dto.department_id));
                }

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
          <p>Employee No: <strong>${result.employee.employee_no}</strong></p>
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
            employeeNo: result.employee.employee_no,
            userId: result.user.user_id,
            epfNo: result.employee.epf_no,
        };
    }

    async findAll(query: EmployeeQueryDto) {
        const page = query.page || 1;
        const pageSize = query.pageSize || 10;
        const offset = (page - 1) * pageSize;

        try {
            const conditions: SQL[] = [];

            if (query.departmentId) {
                conditions.push(eq(schema.employees.departmentId, query.departmentId));
            }

            if (query.positionId) {
                conditions.push(eq(schema.employees.position_id, query.positionId));
            }

            if (query.status) {
                conditions.push(ilike(schema.users.status, `%${query.status.trim()}%`));
            }

            if (query.search && query.search.trim().length > 0) {
                const searchPattern = `%${query.search.trim()}%`;
                conditions.push(
                    or(
                        ilike(schema.employees.employee_no, searchPattern),
                        ilike(schema.employees.first_name, searchPattern),
                        ilike(schema.employees.last_name, searchPattern),
                        ilike(schema.employees.epf_no, searchPattern),
                        ilike(schema.employees.work_email, searchPattern),
                        ilike(schema.employees.mobile_no, searchPattern),
                        ilike(schema.departments.departmentCode, searchPattern),
                        ilike(schema.departments.departmentName, searchPattern),
                        ilike(schema.positions.position_code, searchPattern),
                        ilike(schema.positions.position_name, searchPattern),
                    )!,
                );
            }

            const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

            const supervisorTable = aliasedTable(schema.employees, 'supervisor');

            // Count total
            const [{ totalCount }] = await this.db
                .select({ totalCount: count() })
                .from(schema.employees)
                .leftJoin(schema.departments, eq(schema.employees.departmentId, schema.departments.departmentId))
                .leftJoin(schema.positions, eq(schema.employees.position_id, schema.positions.position_id))
                .leftJoin(schema.users, eq(schema.employees.user_id, schema.users.user_id))
                .where(whereClause);

            const total = Number(totalCount) || 0;

            // Fetch records
            const rows = await this.db
                .select({
                    employee: schema.employees,
                    department: {
                        departmentId: schema.departments.departmentId,
                        departmentCode: schema.departments.departmentCode,
                        departmentName: schema.departments.departmentName,
                        location: schema.departments.location,
                        deptPhone: schema.departments.deptPhone,
                        noOfEmployees: schema.departments.noOfEmployees,
                    },
                    position: {
                        position_id: schema.positions.position_id,
                        position_code: schema.positions.position_code,
                        position_name: schema.positions.position_name,
                        description: schema.positions.description,
                        effective_date: schema.positions.effective_date,
                    },
                    user: {
                        user_id: schema.users.user_id,
                        role: schema.users.role,
                        status: schema.users.status,
                        email_verified: schema.users.email_verified,
                        last_login: schema.users.last_login,
                        created_at: schema.users.created_at,
                    },
                    supervisor: {
                        employee_id: supervisorTable.employee_id,
                        employee_no: supervisorTable.employee_no,
                        first_name: supervisorTable.first_name,
                        last_name: supervisorTable.last_name,
                        epf_no: supervisorTable.epf_no,
                        work_email: supervisorTable.work_email,
                    },
                })
                .from(schema.employees)
                .leftJoin(schema.departments, eq(schema.employees.departmentId, schema.departments.departmentId))
                .leftJoin(schema.positions, eq(schema.employees.position_id, schema.positions.position_id))
                .leftJoin(schema.users, eq(schema.employees.user_id, schema.users.user_id))
                .leftJoin(supervisorTable, eq(schema.employees.supervisor_id, supervisorTable.employee_id))
                .where(whereClause)
                .orderBy(desc(schema.employees.created_at))
                .limit(pageSize)
                .offset(offset);

            const employeeIds = rows.map((r) => r.employee.employee_id);

            // Fetch subcollections in batch
            let contactsMap: Record<string, schema.EmpEmergencyContact[]> = {};
            let qualificationsMap: Record<string, schema.EmpQualification[]> = {};
            let dependentsMap: Record<string, schema.EmpDependent[]> = {};

            if (employeeIds.length > 0) {
                const [allContacts, allQuals, allDeps] = await Promise.all([
                    this.db
                        .select()
                        .from(schema.empEmergencyContacts)
                        .where(inArray(schema.empEmergencyContacts.employee_id, employeeIds)),
                    this.db
                        .select()
                        .from(schema.empQualifications)
                        .where(inArray(schema.empQualifications.employee_id, employeeIds)),
                    this.db
                        .select()
                        .from(schema.empDependents)
                        .where(inArray(schema.empDependents.employee_id, employeeIds)),
                ]);

                for (const c of allContacts) {
                    if (!contactsMap[c.employee_id]) contactsMap[c.employee_id] = [];
                    contactsMap[c.employee_id].push(c);
                }
                for (const q of allQuals) {
                    if (!qualificationsMap[q.employee_id]) qualificationsMap[q.employee_id] = [];
                    qualificationsMap[q.employee_id].push(q);
                }
                for (const d of allDeps) {
                    if (!dependentsMap[d.employee_id]) dependentsMap[d.employee_id] = [];
                    dependentsMap[d.employee_id].push(d);
                }
            }

            const data = rows.map((r) => ({
                ...r.employee,
                department: r.department?.departmentId ? r.department : null,
                position: r.position?.position_id ? r.position : null,
                user: r.user?.user_id ? r.user : null,
                supervisor: r.supervisor?.employee_id ? r.supervisor : null,
                emergency_contacts: contactsMap[r.employee.employee_id] || [],
                qualifications: qualificationsMap[r.employee.employee_id] || [],
                dependents: dependentsMap[r.employee.employee_id] || [],
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
            console.error('[EmployeeService][findAll] DB error:', err);
            throw new InternalServerErrorException('Database error while retrieving employees');
        }
    }

    async findOne(id: string) {
        try {
            const supervisorTable = aliasedTable(schema.employees, 'supervisor');

            const rows = await this.db
                .select({
                    employee: schema.employees,
                    department: {
                        departmentId: schema.departments.departmentId,
                        departmentCode: schema.departments.departmentCode,
                        departmentName: schema.departments.departmentName,
                        location: schema.departments.location,
                        deptPhone: schema.departments.deptPhone,
                        noOfEmployees: schema.departments.noOfEmployees,
                    },
                    position: {
                        position_id: schema.positions.position_id,
                        position_code: schema.positions.position_code,
                        position_name: schema.positions.position_name,
                        description: schema.positions.description,
                        effective_date: schema.positions.effective_date,
                    },
                    user: {
                        user_id: schema.users.user_id,
                        role: schema.users.role,
                        status: schema.users.status,
                        email_verified: schema.users.email_verified,
                        last_login: schema.users.last_login,
                        created_at: schema.users.created_at,
                    },
                    supervisor: {
                        employee_id: supervisorTable.employee_id,
                        employee_no: supervisorTable.employee_no,
                        first_name: supervisorTable.first_name,
                        last_name: supervisorTable.last_name,
                        epf_no: supervisorTable.epf_no,
                        work_email: supervisorTable.work_email,
                    },
                })
                .from(schema.employees)
                .leftJoin(schema.departments, eq(schema.employees.departmentId, schema.departments.departmentId))
                .leftJoin(schema.positions, eq(schema.employees.position_id, schema.positions.position_id))
                .leftJoin(schema.users, eq(schema.employees.user_id, schema.users.user_id))
                .leftJoin(supervisorTable, eq(schema.employees.supervisor_id, supervisorTable.employee_id))
                .where(eq(schema.employees.employee_id, id));

            if (!rows || rows.length === 0) {
                throw new NotFoundException('Employee not found');
            }

            const row = rows[0];

            const [emergency_contacts, qualifications, dependents] = await Promise.all([
                this.db
                    .select()
                    .from(schema.empEmergencyContacts)
                    .where(eq(schema.empEmergencyContacts.employee_id, id)),
                this.db
                    .select()
                    .from(schema.empQualifications)
                    .where(eq(schema.empQualifications.employee_id, id)),
                this.db
                    .select()
                    .from(schema.empDependents)
                    .where(eq(schema.empDependents.employee_id, id)),
            ]);

            return {
                ...row.employee,
                department: row.department?.departmentId ? row.department : null,
                position: row.position?.position_id ? row.position : null,
                user: row.user?.user_id ? row.user : null,
                supervisor: row.supervisor?.employee_id ? row.supervisor : null,
                emergency_contacts,
                qualifications,
                dependents,
            };
        } catch (err) {
            if (err instanceof NotFoundException) throw err;
            console.error('[EmployeeService][findOne] DB error:', err);
            throw new InternalServerErrorException('Database error while retrieving employee details');
        }
    }

    // ─────────────────────────────────────────────────────────────────
    //  GET /employee/supervisors
    //  Returns employees who supervise at least one other employee,
    //  joined with their position & department, supporting pagination
    //  and optional search by name or position name.
    // ─────────────────────────────────────────────────────────────────
    async getSupervisors(query: SupervisorQueryDto) {
        try {
            const page = query.page ?? 1;
            const pageSize = query.pageSize ?? 10;
            const offset = (page - 1) * pageSize;
            const search = query.search?.trim();

            // Build WHERE conditions
            const conditions: SQL[] = [];

            // Only employees that are referenced as supervisor_id by at least one other row
            conditions.push(
                sql`${schema.employees.employee_id} IN (
                    SELECT DISTINCT supervisor_id
                    FROM employees
                    WHERE supervisor_id IS NOT NULL
                )`,
            );

            if (search) {
                conditions.push(
                    or(
                        ilike(schema.employees.first_name, `%${search}%`),
                        ilike(schema.employees.last_name, `%${search}%`),
                        ilike(
                            sql`${schema.employees.first_name} || ' ' || ${schema.employees.last_name}`,
                            `%${search}%`,
                        ),
                        ilike(schema.positions.position_name, `%${search}%`),
                    ) as SQL,
                );
            }

            const whereClause = and(...conditions);

            // Count total
            const [{ total }] = await this.db
                .select({ total: count() })
                .from(schema.employees)
                .leftJoin(schema.positions, eq(schema.employees.position_id, schema.positions.position_id))
                .where(whereClause);

            // Fetch page
            const rows = await this.db
                .select({
                    supervisor_id: schema.employees.employee_id,
                    employee_no: schema.employees.employee_no,
                    first_name: schema.employees.first_name,
                    last_name: schema.employees.last_name,
                    work_email: schema.employees.work_email,
                    mobile_no: schema.employees.mobile_no,
                    position: {
                        position_id: schema.positions.position_id,
                        position_code: schema.positions.position_code,
                        position_name: schema.positions.position_name,
                    },
                    department: {
                        department_id: schema.departments.departmentId,
                        department_code: schema.departments.departmentCode,
                        department_name: schema.departments.departmentName,
                    },
                })
                .from(schema.employees)
                .leftJoin(schema.positions, eq(schema.employees.position_id, schema.positions.position_id))
                .leftJoin(schema.departments, eq(schema.employees.departmentId, schema.departments.departmentId))
                .where(whereClause)
                .orderBy(schema.employees.first_name)
                .limit(pageSize)
                .offset(offset);

            return {
                data: rows.map((r) => ({
                    supervisor_id: r.supervisor_id,
                    employee_no: r.employee_no,
                    name: `${r.first_name} ${r.last_name}`,
                    first_name: r.first_name,
                    last_name: r.last_name,
                    work_email: r.work_email,
                    mobile_no: r.mobile_no,
                    position: r.position?.position_id ? r.position : null,
                    department: r.department?.department_id ? r.department : null,
                })),
                meta: {
                    total: Number(total),
                    page,
                    pageSize,
                    totalPages: Math.ceil(Number(total) / pageSize),
                },
            };
        } catch (err) {
            console.error('[EmployeeService][getSupervisors] DB error:', err);
            throw new InternalServerErrorException('Database error while retrieving supervisors');
        }
    }
}