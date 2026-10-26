import { Injectable, Inject, BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, or, and, count, desc, ilike, SQL } from 'drizzle-orm';
import * as schema from '../database/schema';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateEmployeeRequestDto } from './dto/create-employee-request.dto';
import { EmployeeRequestQueryDto } from './dto/employee-request-query.dto';
import { generateEmployeeNo } from '../common/utils/code-generator.util';

@Injectable()
export class HrService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: NodePgDatabase<typeof schema>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createEmployeeRequest(dto: CreateEmployeeRequestDto, requestedByUserId: string) {
    // 1. Check if user with work_email already exists
    const existingUser = await this.db.query.users.findFirst({
      where: eq(schema.users.email, dto.work_email),
    });
    if (existingUser) {
      throw new BadRequestException('A user with this work email already exists in the system');
    }

    // 2. Check if employee with epf_no already exists
    const existingEmployee = await this.db.query.employees.findFirst({
      where: eq(schema.employees.epf_no, dto.epf_no),
    });
    if (existingEmployee) {
      throw new BadRequestException('An employee with this EPF number already exists');
    }

    // 3. Check if there is already a PENDING request with same work_email or epf_no
    const pendingRequest = await this.db.query.employeeAccountRequests.findFirst({
      where: and(
        eq(schema.employeeAccountRequests.status, 'PENDING'),
        or(
          eq(schema.employeeAccountRequests.work_email, dto.work_email),
          eq(schema.employeeAccountRequests.epf_no, dto.epf_no),
        ),
      ),
    });
    if (pendingRequest) {
      throw new BadRequestException('A pending account request with this work email or EPF number already exists');
    }

    // 4. Check or generate readable Employee No (EMP-0001, etc.)
    let employeeNo = dto.employee_no?.trim();
    if (employeeNo) {
      const existingEmpNo = await this.db.query.employees.findFirst({
        where: eq(schema.employees.employee_no, employeeNo),
      });
      if (existingEmpNo) {
        throw new BadRequestException('An employee with this Employee Number already exists');
      }
    } else {
      employeeNo = await generateEmployeeNo(this.db);
    }

    // 5. Create request in database
    let createdRequest: schema.EmployeeAccountRequest;
    try {
      const [record] = await this.db
        .insert(schema.employeeAccountRequests)
        .values({
          requested_by: requestedByUserId || null,
          status: 'PENDING',
          employee_no: employeeNo,
          first_name: dto.first_name,
          last_name: dto.last_name,
          dob: dto.dob,
          join_date: dto.join_date,
          epf_no: dto.epf_no,
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
          role: dto.role || 'employee',
          emergency_contacts: dto.emergency_contacts || [],
          qualifications: dto.qualifications || [],
          dependents: dto.dependents || [],
        })
        .returning();
      createdRequest = record;
    } catch (err) {
      console.error('[HrService][createEmployeeRequest] DB error:', err);
      throw new InternalServerErrorException('Failed to submit employee account request');
    }

    // 5. Fetch HR user's name for notification
    let hrName = 'HR';
    try {
      if (requestedByUserId) {
        const hrUser = await this.db.query.users.findFirst({
          where: eq(schema.users.user_id, requestedByUserId),
        });
        if (hrUser) {
          hrName = `${hrUser.first_name} ${hrUser.last_name}`;
        }
      }
    } catch (e) {
      console.warn('Could not fetch HR user details for notification:', e);
    }

    // 6. Send in-app notification to Admin(s)
    try {
      await this.notificationsService.create({
        recipient_role: 'admin',
        title: 'New Employee Account Request',
        message: `${hrName} submitted an employee account request for ${dto.first_name} ${dto.last_name} (EPF: ${dto.epf_no}).`,
        type: 'EMPLOYEE_ACCOUNT_REQUEST',
        data: {
          requestId: createdRequest.id,
          employeeName: `${dto.first_name} ${dto.last_name}`,
          epfNo: dto.epf_no,
          workEmail: dto.work_email,
          requestedBy: requestedByUserId,
          hrName,
        },
      });
    } catch (notifyErr) {
      console.error('[HrService][createEmployeeRequest] Notification creation error:', notifyErr);
    }

    return {
      message: 'Employee account request successfully submitted to Admin for approval',
      data: createdRequest,
    };
  }

  async listEmployeeRequests(query: EmployeeRequestQueryDto, requestedByUserId?: string) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 10;
    const offset = (page - 1) * pageSize;

    try {
      const conditions: SQL[] = [];

      if (query.status && query.status.trim().length > 0) {
        conditions.push(eq(schema.employeeAccountRequests.status, query.status.toUpperCase()));
      }

      if (requestedByUserId) {
        conditions.push(eq(schema.employeeAccountRequests.requested_by, requestedByUserId));
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
      console.error('[HrService][listEmployeeRequests] DB error:', err);
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
      console.error('[HrService][getEmployeeRequestById] DB error:', err);
      throw new InternalServerErrorException('Database error while fetching employee request');
    }
  }
}
