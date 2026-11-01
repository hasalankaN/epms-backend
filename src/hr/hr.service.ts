import {
  Injectable,
  Inject,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, or, and, count, desc, ilike, sql, SQL, inArray, lte, gte } from 'drizzle-orm';
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

  // -------------------------------------------------------------
  // Employee Requests (Existing)
  // -------------------------------------------------------------
  async createEmployeeRequest(dto: CreateEmployeeRequestDto, requestedByUserId: string) {
    const existingUser = await this.db.query.users.findFirst({
      where: eq(schema.users.email, dto.work_email),
    });
    if (existingUser) {
      throw new BadRequestException('A user with this work email already exists in the system');
    }

    const existingEmployee = await this.db.query.employees.findFirst({
      where: eq(schema.employees.epf_no, dto.epf_no),
    });
    if (existingEmployee) {
      throw new BadRequestException('An employee with this EPF number already exists');
    }

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

  // -------------------------------------------------------------
  // 1. Profile
  // -------------------------------------------------------------
  async getProfile(userId: string) {
    const [user] = await this.db.select().from(schema.users).where(eq(schema.users.user_id, userId));
    const [employee] = await this.db.select().from(schema.employees).where(eq(schema.employees.user_id, userId));
    return { user, employee };
  }

  async updateProfile(userId: string, data: any) {
    const [updatedUser] = await this.db
      .update(schema.users)
      .set({
        first_name: data.first_name,
        last_name: data.last_name,
        phone_number: data.phone_number,
        updated_at: new Date(),
      })
      .where(eq(schema.users.user_id, userId))
      .returning();

    return updatedUser;
  }

  // -------------------------------------------------------------
  // 2. Employees Management
  // -------------------------------------------------------------
  async getEmployees(query?: any) {
    return this.db
      .select({
        employee: schema.employees,
        department: schema.departments,
        position: schema.positions,
        user: {
          user_id: schema.users.user_id,
          email: schema.users.email,
          role: schema.users.role,
          status: schema.users.status,
        },
      })
      .from(schema.employees)
      .leftJoin(schema.departments, eq(schema.employees.departmentId, schema.departments.departmentId))
      .leftJoin(schema.positions, eq(schema.employees.position_id, schema.positions.position_id))
      .leftJoin(schema.users, eq(schema.employees.user_id, schema.users.user_id))
      .orderBy(desc(schema.employees.created_at));
  }

  async getEmployeeById(id: string) {
    const [employee] = await this.db
      .select()
      .from(schema.employees)
      .where(eq(schema.employees.employee_id, id));

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const [dept, pos, contacts, qualifications, dependents, experiences] = await Promise.all([
      employee.departmentId
        ? this.db.select().from(schema.departments).where(eq(schema.departments.departmentId, employee.departmentId))
        : [null],
      employee.position_id
        ? this.db.select().from(schema.positions).where(eq(schema.positions.position_id, employee.position_id))
        : [null],
      this.db.select().from(schema.empEmergencyContacts).where(eq(schema.empEmergencyContacts.employee_id, id)),
      this.db.select().from(schema.empQualifications).where(eq(schema.empQualifications.employee_id, id)),
      this.db.select().from(schema.empDependents).where(eq(schema.empDependents.employee_id, id)),
      this.db.select().from(schema.workExperiences).where(eq(schema.workExperiences.employee_id, id)),
    ]);

    return {
      employee,
      department: dept[0] || null,
      position: pos[0] || null,
      emergency_contacts: contacts,
      qualifications,
      dependents,
      work_experiences: experiences,
    };
  }

  async createEmployee(dto: any) {
    let employeeNo = dto.employee_no?.trim();
    if (!employeeNo) {
      employeeNo = await generateEmployeeNo(this.db);
    }

    const result = await this.db
      .insert(schema.employees)
      .values({
        employee_no: employeeNo,
        first_name: dto.first_name,
        last_name: dto.last_name,
        dob: dto.dob,
        join_date: dto.join_date,
        epf_no: dto.epf_no,
        work_email: dto.work_email,
        personal_email: dto.personal_email || null,
        mobile_no: dto.mobile_no || null,
        street: dto.street || null,
        city: dto.city || null,
        province: dto.province || null,
        country: dto.country || null,
        departmentId: dto.departmentId || null,
        position_id: dto.position_id || null,
        supervisor_id: dto.supervisor_id || null,
      })
      .returning();

    return result[0];
  }

  async updateEmployee(id: string, dto: any) {
    const [updated] = await this.db
      .update(schema.employees)
      .set({
        ...dto,
        updated_at: new Date(),
      })
      .where(eq(schema.employees.employee_id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException('Employee not found');
    }
    return updated;
  }

  async deleteEmployee(id: string) {
    const [deleted] = (await this.db
      .delete(schema.employees)
      .where(eq(schema.employees.employee_id, id))
      .returning()) as any[];

    if (!deleted) {
      throw new NotFoundException('Employee not found');
    }
    return { message: 'Employee deleted successfully' };
  }

  async updateEmployeeSupervisor(id: string, supervisor_id: string | null) {
    const [updated] = await this.db
      .update(schema.employees)
      .set({ supervisor_id, updated_at: new Date() })
      .where(eq(schema.employees.employee_id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException('Employee not found');
    }
    return updated;
  }

  async getEmployeeRoles(id: string) {
    const [emp] = await this.db.select().from(schema.employees).where(eq(schema.employees.employee_id, id));
    if (!emp) throw new NotFoundException('Employee not found');

    if (!emp.user_id) return { role: 'employee', roles: [] };

    const [user] = await this.db.select().from(schema.users).where(eq(schema.users.user_id, emp.user_id));
    return { role: user?.role || 'employee' };
  }

  async updateEmployeeRoles(id: string, dto: { role: string }) {
    const [emp] = await this.db.select().from(schema.employees).where(eq(schema.employees.employee_id, id));
    if (!emp || !emp.user_id) throw new NotFoundException('Employee or user account not found');

    const [updated] = await this.db
      .update(schema.users)
      .set({ role: dto.role, updated_at: new Date() })
      .where(eq(schema.users.user_id, emp.user_id))
      .returning();

    return { message: 'Role updated successfully', role: updated.role };
  }

  // -------------------------------------------------------------
  // 3. Profile Requests
  // -------------------------------------------------------------
  async getProfileUpdateRequests() {
    return this.db
      .select({
        request: schema.requests,
        employee: schema.employees,
      })
      .from(schema.requests)
      .leftJoin(schema.employees, eq(schema.requests.target_emp_id, schema.employees.employee_id))
      .where(eq(schema.requests.request_type, 'PROFILE_UPDATE'))
      .orderBy(desc(schema.requests.requested_date));
  }

  async decideProfileUpdateRequest(
    id: string,
    decidedBy: string,
    dto: { decision: 'APPROVED' | 'REJECTED'; comment?: string },
  ) {
    const [req] = await this.db.select().from(schema.requests).where(eq(schema.requests.request_id, id));
    if (!req) throw new NotFoundException('Request not found');

    const [updatedReq] = await this.db
      .update(schema.requests)
      .set({
        status: dto.decision,
        decided_by: decidedBy,
        decision_date: new Date(),
        decision_comment: dto.comment || null,
      })
      .where(eq(schema.requests.request_id, id))
      .returning();

    // If approved, apply update to employee
    if (dto.decision === 'APPROVED' && req.target_emp_id && req.request_data) {
      const data: any = req.request_data;
      await this.db
        .update(schema.employees)
        .set({
          mobile_no: data.mobile_no,
          personal_email: data.personal_email,
          street: data.street,
          city: data.city,
          province: data.province,
          updated_at: new Date(),
        })
        .where(eq(schema.employees.employee_id, req.target_emp_id));
    }

    // Notify employee
    await this.notificationsService.create({
      recipient_id: req.requested_by,
      title: `Profile Update Request ${dto.decision}`,
      message: `Your profile update request was ${dto.decision.toLowerCase()}.`,
      type: 'REQUEST',
      data: { requestId: id },
    });

    return updatedReq;
  }

  // -------------------------------------------------------------
  // 4. Attendance
  // -------------------------------------------------------------
  async getAttendance(query?: { date?: string; empId?: string }) {
    const conditions: SQL[] = [];
    if (query?.date) conditions.push(eq(schema.attendance.date, query.date));
    if (query?.empId) conditions.push(eq(schema.attendance.emp_id, query.empId));

    return this.db
      .select({
        attendance: schema.attendance,
        employee: {
          employee_id: schema.employees.employee_id,
          employee_no: schema.employees.employee_no,
          first_name: schema.employees.first_name,
          last_name: schema.employees.last_name,
        },
      })
      .from(schema.attendance)
      .innerJoin(schema.employees, eq(schema.attendance.emp_id, schema.employees.employee_id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(schema.attendance.date));
  }

  async getAttendanceSummary(empId: string) {
    const records = await this.db
      .select()
      .from(schema.attendance)
      .where(eq(schema.attendance.emp_id, empId));

    const totalDays = records.length;
    const presentDays = records.filter((r) => r.status === 'PRESENT').length;
    const lateDays = records.filter((r) => r.in_late).length;
    const earlyDepartures = records.filter((r) => r.early_departure).length;
    const totalLateMinutes = records.reduce((acc, r) => acc + (r.total_late_min || 0), 0);
    const totalWorkHours = records.reduce((acc, r) => acc + Number(r.work_hours || 0), 0);

    return {
      totalDays,
      presentDays,
      lateDays,
      earlyDepartures,
      totalLateMinutes,
      totalWorkHours,
    };
  }

  async notifyAttendance(dto: { empId: string; message: string; title?: string }) {
    const [emp] = await this.db.select().from(schema.employees).where(eq(schema.employees.employee_id, dto.empId));
    if (!emp || !emp.user_id) throw new NotFoundException('Employee user not found');

    return this.notificationsService.create({
      recipient_id: emp.user_id,
      title: dto.title || 'Attendance Notice',
      message: dto.message,
      type: 'ATTENDANCE',
    });
  }

  async getOvertime(query?: { minHours?: number }) {
    const min = query?.minHours || 8;
    return this.db
      .select({
        attendance: schema.attendance,
        employee: schema.employees,
      })
      .from(schema.attendance)
      .innerJoin(schema.employees, eq(schema.attendance.emp_id, schema.employees.employee_id))
      .where(sql`${schema.attendance.work_hours} > ${min}`)
      .orderBy(desc(schema.attendance.date));
  }

  // -------------------------------------------------------------
  // 5. Training
  // -------------------------------------------------------------
  async createTraining(userId: string, dto: any) {
    const [training] = await this.db
      .insert(schema.trainings)
      .values({
        hr_id: userId,
        name: dto.name,
        scheduled_date: dto.scheduled_date,
        scheduled_time: dto.scheduled_time || null,
        mode: dto.mode || 'PHYSICAL',
        venue: dto.venue || null,
        budget: String(dto.budget || 0),
        instructors: dto.instructors || [],
        status: dto.status || 'PLANNED',
      })
      .returning();

    if (dto.participants && Array.isArray(dto.participants)) {
      for (const empId of dto.participants) {
        await this.db
          .insert(schema.trainingParticipants)
          .values({
            training_id: training.training_id,
            emp_id: empId,
            attended: false,
          });
      }
    }

    return training;
  }

  async getTrainings() {
    return this.db.select().from(schema.trainings).orderBy(desc(schema.trainings.scheduled_date));
  }

  async getTrainingById(id: string) {
    const [training] = await this.db.select().from(schema.trainings).where(eq(schema.trainings.training_id, id));
    if (!training) throw new NotFoundException('Training not found');

    const [participants, materials] = await Promise.all([
      this.db
        .select({
          participant: schema.trainingParticipants,
          employee: schema.employees,
        })
        .from(schema.trainingParticipants)
        .innerJoin(schema.employees, eq(schema.trainingParticipants.emp_id, schema.employees.employee_id))
        .where(eq(schema.trainingParticipants.training_id, id)),
      this.db.select().from(schema.trainingMaterials).where(eq(schema.trainingMaterials.training_id, id)),
    ]);

    return { ...training, participants, materials };
  }

  async updateTraining(id: string, dto: any) {
    const [updated] = await this.db
      .update(schema.trainings)
      .set(dto)
      .where(eq(schema.trainings.training_id, id))
      .returning();

    if (!updated) throw new NotFoundException('Training not found');
    return updated;
  }

  async getTrainingAttendance(trainingId: string) {
    return this.db
      .select({
        participant: schema.trainingParticipants,
        employee: schema.employees,
      })
      .from(schema.trainingParticipants)
      .innerJoin(schema.employees, eq(schema.trainingParticipants.emp_id, schema.employees.employee_id))
      .where(eq(schema.trainingParticipants.training_id, trainingId));
  }

  async submitHrTrainingEvaluation(trainingId: string, dto: { emp_id: string; rating: number; evaluation: string }) {
    const [participant] = await this.db
      .select()
      .from(schema.trainingParticipants)
      .where(
        and(
          eq(schema.trainingParticipants.training_id, trainingId),
          eq(schema.trainingParticipants.emp_id, dto.emp_id),
        ),
      );

    if (!participant) throw new NotFoundException('Participant not found for this training');

    const [updated] = await this.db
      .update(schema.trainingParticipants)
      .set({
        rating: dto.rating,
        evaluation: dto.evaluation,
        evaluated_at: new Date(),
      })
      .where(eq(schema.trainingParticipants.id, participant.id))
      .returning();

    return updated;
  }

  async getTrainingReport(trainingId: string) {
    const training = await this.getTrainingById(trainingId);
    const totalParticipants = training.participants.length;
    const attendedCount = training.participants.filter((p: any) => p.participant.attended).length;
    const evaluations = training.participants.filter((p: any) => p.participant.rating);
    const avgRating =
      evaluations.length > 0
        ? evaluations.reduce((acc: number, p: any) => acc + (p.participant.rating || 0), 0) / evaluations.length
        : 0;

    return {
      training,
      totalParticipants,
      attendedCount,
      attendanceRate: totalParticipants > 0 ? (attendedCount / totalParticipants) * 100 : 0,
      averageRating: avgRating.toFixed(1),
    };
  }

  async updateTrainingBudget(id: string, dto: { budget: number; budget_status: string }) {
    const [updated] = await this.db
      .update(schema.trainings)
      .set({
        budget: String(dto.budget),
        budget_status: dto.budget_status,
      })
      .where(eq(schema.trainings.training_id, id))
      .returning();

    if (!updated) throw new NotFoundException('Training not found');
    return updated;
  }

  async createTrainingMaterial(trainingId: string, dto: { title: string; file_path: string }) {
    return this.db
      .insert(schema.trainingMaterials)
      .values({
        training_id: trainingId,
        title: dto.title,
        file_path: dto.file_path,
      })
      .returning();
  }

  async updateTrainingMaterial(trainingId: string, materialId: string, dto: any) {
    return this.db
      .update(schema.trainingMaterials)
      .set(dto)
      .where(
        and(
          eq(schema.trainingMaterials.material_id, materialId),
          eq(schema.trainingMaterials.training_id, trainingId),
        ),
      )
      .returning();
  }

  async deleteTrainingMaterial(trainingId: string, materialId: string) {
    await this.db
      .delete(schema.trainingMaterials)
      .where(
        and(
          eq(schema.trainingMaterials.material_id, materialId),
          eq(schema.trainingMaterials.training_id, trainingId),
        ),
      );
    return { message: 'Material deleted successfully' };
  }

  // -------------------------------------------------------------
  // 6. Leave
  // -------------------------------------------------------------
  async getLeaves(query?: { status?: string }) {
    const conditions: SQL[] = [];
    if (query?.status) conditions.push(eq(schema.leaves.status, query.status.toUpperCase()));

    return this.db
      .select({
        leave: schema.leaves,
        employee: schema.employees,
      })
      .from(schema.leaves)
      .innerJoin(schema.employees, eq(schema.leaves.emp_id, schema.employees.employee_id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(schema.leaves.created_at));
  }

  async decideLeave(
    leaveId: string,
    decidedBy: string,
    dto: { decision: 'APPROVED' | 'REJECTED'; comment?: string },
  ) {
    const [leave] = await this.db.select().from(schema.leaves).where(eq(schema.leaves.leave_id, leaveId));
    if (!leave) throw new NotFoundException('Leave request not found');

    const year = new Date(leave.start_date).getFullYear();
    const days = Number(leave.days);

    const [bal] = await this.db
      .select()
      .from(schema.leaveBalances)
      .where(
        and(
          eq(schema.leaveBalances.emp_id, leave.emp_id),
          eq(schema.leaveBalances.leave_type, leave.leave_type),
          eq(schema.leaveBalances.year, year),
        ),
      );

    if (bal) {
      if (dto.decision === 'APPROVED') {
        await this.db
          .update(schema.leaveBalances)
          .set({
            used: sql`GREATEST(0, ${schema.leaveBalances.used} + ${days})`,
            pending: sql`GREATEST(0, ${schema.leaveBalances.pending} - ${days})`,
          })
          .where(eq(schema.leaveBalances.balance_id, bal.balance_id));
      } else {
        await this.db
          .update(schema.leaveBalances)
          .set({
            pending: sql`GREATEST(0, ${schema.leaveBalances.pending} - ${days})`,
          })
          .where(eq(schema.leaveBalances.balance_id, bal.balance_id));
      }
    }

    const [updatedLeave] = await this.db
      .update(schema.leaves)
      .set({
        status: dto.decision,
        approved_by: decidedBy,
        approval_date: new Date(),
        decision_comment: dto.comment || null,
      })
      .where(eq(schema.leaves.leave_id, leaveId))
      .returning();

    // Notify employee
    const [emp] = await this.db.select().from(schema.employees).where(eq(schema.employees.employee_id, leave.emp_id));
    if (emp?.user_id) {
      await this.notificationsService.create({
        recipient_id: emp.user_id,
        title: `Leave Request ${dto.decision} by HR`,
        message: `Your leave request for ${leave.leave_type} (${leave.days} days) has been ${dto.decision.toLowerCase()} by HR.`,
        type: 'LEAVE',
      });
    }

    return updatedLeave;
  }

  async getLeaveBalances(empId: string) {
    const currentYear = new Date().getFullYear();
    return this.db
      .select()
      .from(schema.leaveBalances)
      .where(and(eq(schema.leaveBalances.emp_id, empId), eq(schema.leaveBalances.year, currentYear)));
  }

  async createSpecialLeave(dto: { emp_id: string; days: number; reason: string; start_date: string; end_date: string }) {
    const [leave] = await this.db
      .insert(schema.leaves)
      .values({
        emp_id: dto.emp_id,
        leave_type: 'SPECIAL',
        start_date: dto.start_date,
        end_date: dto.end_date,
        days: String(dto.days),
        reason: dto.reason,
        status: 'APPROVED',
        approval_date: new Date(),
      })
      .returning();

    return leave;
  }

  async updateLeaveBalance(empId: string, dto: { leave_type: string; year: number; balance: number }) {
    const [existing] = await this.db
      .select()
      .from(schema.leaveBalances)
      .where(
        and(
          eq(schema.leaveBalances.emp_id, empId),
          eq(schema.leaveBalances.leave_type, dto.leave_type),
          eq(schema.leaveBalances.year, dto.year),
        ),
      );

    if (existing) {
      return this.db
        .update(schema.leaveBalances)
        .set({ balance: String(dto.balance) })
        .where(eq(schema.leaveBalances.balance_id, existing.balance_id))
        .returning();
    }

    return this.db
      .insert(schema.leaveBalances)
      .values({
        emp_id: empId,
        leave_type: dto.leave_type,
        year: dto.year,
        balance: String(dto.balance),
      })
      .returning();
  }

  async getLeavePolicies() {
    return this.db.select().from(schema.leavePolicies);
  }

  async getLeavePolicy(leaveType: string) {
    const [policy] = await this.db
      .select()
      .from(schema.leavePolicies)
      .where(eq(schema.leavePolicies.leave_type, leaveType));
    if (!policy) throw new NotFoundException('Leave policy not found');
    return policy;
  }

  async updateLeavePolicy(leaveType: string, dto: any, userId: string) {
    const [existing] = await this.db
      .select()
      .from(schema.leavePolicies)
      .where(eq(schema.leavePolicies.leave_type, leaveType));

    if (existing) {
      return this.db
        .update(schema.leavePolicies)
        .set({
          ...dto,
          updated_by: userId,
          updated_at: new Date(),
        })
        .where(eq(schema.leavePolicies.leave_type, leaveType))
        .returning();
    }

    return this.db
      .insert(schema.leavePolicies)
      .values({
        leave_type: leaveType,
        days_per_year: String(dto.days_per_year || 14),
        carry_forward: dto.carry_forward || false,
        rules: dto.rules || '',
        updated_by: userId,
      })
      .returning();
  }

  // -------------------------------------------------------------
  // 7. Production and Performance
  // -------------------------------------------------------------
  async getProduction(query?: any) {
    return this.db
      .select({
        production: schema.production,
        employee: schema.employees,
      })
      .from(schema.production)
      .innerJoin(schema.employees, eq(schema.production.emp_id, schema.employees.employee_id))
      .orderBy(desc(schema.production.date));
  }

  async getProductionReport() {
    const rows = await this.db.select().from(schema.production);
    const totalExpected = rows.reduce((acc, r) => acc + (r.expected_count || 0), 0);
    const totalActual = rows.reduce((acc, r) => acc + (r.actual_count || 0), 0);
    const efficiency = totalExpected > 0 ? (totalActual / totalExpected) * 100 : 0;

    return {
      totalRecords: rows.length,
      totalExpected,
      totalActual,
      overallEfficiency: efficiency.toFixed(2),
    };
  }

  async getPerformanceReviews() {
    return this.db
      .select({
        review: schema.performanceReviews,
        employee: schema.employees,
      })
      .from(schema.performanceReviews)
      .innerJoin(schema.employees, eq(schema.performanceReviews.emp_id, schema.employees.employee_id))
      .orderBy(desc(schema.performanceReviews.date));
  }

  async createPerformanceReview(userId: string, dto: any) {
    return this.db
      .insert(schema.performanceReviews)
      .values({
        emp_id: dto.emp_id,
        reviewer_id: userId,
        quarter: dto.quarter,
        rating: String(dto.rating),
        comments: dto.comments || null,
        feedback: dto.feedback || null,
        reward: dto.reward || null,
      })
      .returning();
  }

  async addReviewFeedback(id: string, dto: { feedback: string; reward?: string }) {
    return this.db
      .update(schema.performanceReviews)
      .set({
        feedback: dto.feedback,
        reward: dto.reward || null,
      })
      .where(eq(schema.performanceReviews.review_id, id))
      .returning();
  }

  async createCompensation(dto: { emp_id: string; amount: number; description: string; month: string }) {
    return this.db
      .insert(schema.bonuses)
      .values({
        emp_id: dto.emp_id,
        description: dto.description,
        amount: String(dto.amount),
        month: dto.month,
      })
      .returning();
  }

  async getDepartmentPerformance(deptId: string) {
    const employeesInDept = await this.db
      .select({ employee_id: schema.employees.employee_id })
      .from(schema.employees)
      .where(eq(schema.employees.departmentId, deptId));

    const empIds = employeesInDept.map((e) => e.employee_id);
    if (empIds.length === 0) {
      return { departmentId: deptId, averageRating: 0, totalReviews: 0 };
    }

    const reviews = await this.db
      .select()
      .from(schema.performanceReviews)
      .where(inArray(schema.performanceReviews.emp_id, empIds));

    const totalReviews = reviews.length;
    const avgRating =
      totalReviews > 0 ? reviews.reduce((acc, r) => acc + Number(r.rating), 0) / totalReviews : 0;

    return {
      departmentId: deptId,
      totalEmployees: empIds.length,
      totalReviews,
      averageRating: avgRating.toFixed(2),
    };
  }

  // -------------------------------------------------------------
  // 8. Department and Position Management
  // -------------------------------------------------------------
  async createDepartment(dto: any) {
    return this.db
      .insert(schema.departments)
      .values({
        departmentCode: dto.department_code,
        departmentName: dto.department_name,
        location: dto.location || null,
        deptPhone: dto.dept_phone || null,
      })
      .returning();
  }

  async deleteDepartment(id: string) {
    // Business rule: A department cannot be deleted while employees are assigned
    const assigned = await this.db
      .select({ count: count() })
      .from(schema.employees)
      .where(eq(schema.employees.departmentId, id));

    if (Number(assigned[0]?.count) > 0) {
      throw new BadRequestException('Cannot delete department while employees are assigned to it');
    }

    await this.db.delete(schema.departments).where(eq(schema.departments.departmentId, id));
    return { message: 'Department deleted successfully' };
  }

  async createPosition(dto: any) {
    return this.db
      .insert(schema.positions)
      .values({
        position_code: dto.position_code,
        position_name: dto.position_name,
        description: dto.description || null,
        effective_date: dto.effective_date || null,
      })
      .returning();
  }

  async updatePosition(id: string, dto: any) {
    return this.db
      .update(schema.positions)
      .set(dto)
      .where(eq(schema.positions.position_id, id))
      .returning();
  }

  async deletePosition(id: string) {
    // Business rule: A position cannot be deleted while employees are assigned
    const assigned = await this.db
      .select({ count: count() })
      .from(schema.employees)
      .where(eq(schema.employees.position_id, id));

    if (Number(assigned[0]?.count) > 0) {
      throw new BadRequestException('Cannot delete position while employees are assigned to it');
    }

    await this.db.delete(schema.positions).where(eq(schema.positions.position_id, id));
    return { message: 'Position deleted successfully' };
  }

  async assignPosition(positionId: string, userId: string, dto: { emp_id: string; dept_id?: string; start_date?: string; reason?: string }) {
    const startDate = dto.start_date || new Date().toISOString().slice(0, 10);

    // Record in position history
    await this.db.insert(schema.positionHistory).values({
      emp_id: dto.emp_id,
      position_id: positionId,
      dept_id: dto.dept_id || null,
      start_date: startDate,
      reason: dto.reason || 'Assigned position',
      created_by: userId,
    });

    // Update employee current position
    const [updatedEmp] = await this.db
      .update(schema.employees)
      .set({
        position_id: positionId,
        departmentId: dto.dept_id || undefined,
        updated_at: new Date(),
      })
      .where(eq(schema.employees.employee_id, dto.emp_id))
      .returning();

    return updatedEmp;
  }

  async transferPosition(userId: string, dto: { emp_id: string; new_position_id: string; new_dept_id?: string; start_date?: string; reason?: string }) {
    return this.assignPosition(dto.new_position_id, userId, {
      emp_id: dto.emp_id,
      dept_id: dto.new_dept_id,
      start_date: dto.start_date,
      reason: dto.reason || 'Position transfer',
    });
  }

  async getPositionHistory(positionId: string) {
    return this.db
      .select({
        history: schema.positionHistory,
        employee: schema.employees,
      })
      .from(schema.positionHistory)
      .innerJoin(schema.employees, eq(schema.positionHistory.emp_id, schema.employees.employee_id))
      .where(eq(schema.positionHistory.position_id, positionId))
      .orderBy(desc(schema.positionHistory.start_date));
  }

  // -------------------------------------------------------------
  // 9. Salary Management
  // -------------------------------------------------------------
  async getSalary(empId: string) {
    const today = new Date().toISOString().slice(0, 10);
    const [salary] = await this.db
      .select()
      .from(schema.salaries)
      .where(and(eq(schema.salaries.emp_id, empId), lte(schema.salaries.effective_date, today)))
      .orderBy(desc(schema.salaries.effective_date))
      .limit(1);

    if (!salary) return { basicSalary: 0, allowances: [], deductions: [], net: 0 };

    const [allowancesList, deductionsList] = await Promise.all([
      this.db.select().from(schema.allowances).where(eq(schema.allowances.salary_id, salary.salary_id)),
      this.db.select().from(schema.deductions).where(eq(schema.deductions.salary_id, salary.salary_id)),
    ]);

    const totalAllowances = allowancesList.reduce((acc, a) => acc + Number(a.amount), 0);
    const totalDeductions = deductionsList.reduce((acc, d) => acc + Number(d.amount), 0);
    const net = Number(salary.basic_salary) + totalAllowances - totalDeductions;

    return {
      salary,
      allowances: allowancesList,
      deductions: deductionsList,
      totalAllowances,
      totalDeductions,
      netSalary: net,
    };
  }

  async updateSalary(empId: string, userId: string, dto: { basic_salary: number; effective_date: string; reason?: string }) {
    // Business rule: append-only with effectiveDate
    return this.db
      .insert(schema.salaries)
      .values({
        emp_id: empId,
        basic_salary: String(dto.basic_salary),
        effective_date: dto.effective_date,
        reason: dto.reason || 'Salary revision',
        created_by: userId,
      })
      .returning();
  }

  async addDeduction(empId: string, dto: { description: string; amount: number }) {
    const current = await this.getSalary(empId);
    if (!current.salary) throw new BadRequestException('No active salary found for this employee');

    return this.db
      .insert(schema.deductions)
      .values({
        salary_id: current.salary.salary_id,
        description: dto.description,
        amount: String(dto.amount),
      })
      .returning();
  }

  async deleteDeduction(empId: string, deductionId: string) {
    await this.db.delete(schema.deductions).where(eq(schema.deductions.deduction_id, deductionId));
    return { message: 'Deduction deleted successfully' };
  }

  async addAllowance(empId: string, dto: { description: string; amount: number }) {
    const current = await this.getSalary(empId);
    if (!current.salary) throw new BadRequestException('No active salary found for this employee');

    return this.db
      .insert(schema.allowances)
      .values({
        salary_id: current.salary.salary_id,
        description: dto.description,
        amount: String(dto.amount),
      })
      .returning();
  }

  async deleteAllowance(empId: string, allowanceId: string) {
    await this.db.delete(schema.allowances).where(eq(schema.allowances.allowance_id, allowanceId));
    return { message: 'Allowance deleted successfully' };
  }

  async createBonus(userId: string, dto: { emp_id: string; description: string; amount: number; month: string }) {
    return this.db
      .insert(schema.bonuses)
      .values({
        emp_id: dto.emp_id,
        description: dto.description,
        amount: String(dto.amount),
        month: dto.month,
        created_by: userId,
      })
      .returning();
  }

  async getSalaryHistory(empId: string) {
    return this.db
      .select()
      .from(schema.salaries)
      .where(eq(schema.salaries.emp_id, empId))
      .orderBy(desc(schema.salaries.effective_date));
  }

  async createSalarySlip(
    userId: string,
    dto: { emp_id: string; month: string; basic_salary?: number; overtime_amount?: number; bonus_amount?: number },
  ) {
    const current = await this.getSalary(dto.emp_id);
    if (!current.salary) throw new BadRequestException('No active salary configured for employee');

    const basicSalary = dto.basic_salary !== undefined ? dto.basic_salary : Number(current.salary.basic_salary);
    const allowances = current.totalAllowances;
    const deductions = current.totalDeductions;
    const overtime = dto.overtime_amount || 0;
    const bonus = dto.bonus_amount || 0;

    // Business rule: net = basic + allowances + overtime + bonuses - deductions
    const netSalary = basicSalary + allowances + overtime + bonus - deductions;

    return this.db
      .insert(schema.salarySlips)
      .values({
        emp_id: dto.emp_id,
        salary_id: current.salary.salary_id,
        month: dto.month,
        basic_salary: String(basicSalary),
        total_allowances: String(allowances),
        overtime_amount: String(overtime),
        bonus_amount: String(bonus),
        total_deductions: String(deductions),
        net_salary: String(netSalary),
        generated_by: userId,
      })
      .returning();
  }

  async getSalarySlipDownload(slipId: string) {
    const [slip] = await this.db.select().from(schema.salarySlips).where(eq(schema.salarySlips.slip_id, slipId));
    if (!slip) throw new NotFoundException('Salary slip not found');
    return slip;
  }

  async getSalaryReports(query?: { month?: string }) {
    const conditions: SQL[] = [];
    if (query?.month) conditions.push(eq(schema.salarySlips.month, query.month));

    return this.db
      .select({
        slip: schema.salarySlips,
        employee: schema.employees,
      })
      .from(schema.salarySlips)
      .innerJoin(schema.employees, eq(schema.salarySlips.emp_id, schema.employees.employee_id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(schema.salarySlips.month));
  }

  // -------------------------------------------------------------
  // 10. Recruitment
  // -------------------------------------------------------------
  async createVacancy(userId: string, dto: any) {
    return this.db
      .insert(schema.jobPostings)
      .values({
        hr_id: userId,
        dept_id: dto.dept_id || null,
        position_id: dto.position_id || null,
        title: dto.title,
        requirements: dto.requirements || null,
        description: dto.description || null,
        closing_date: dto.closing_date || null,
        status: dto.status || 'OPEN',
      })
      .returning();
  }

  async updateVacancy(id: string, dto: any) {
    return this.db.update(schema.jobPostings).set(dto).where(eq(schema.jobPostings.job_id, id)).returning();
  }

  async deleteVacancy(id: string) {
    await this.db.delete(schema.jobPostings).where(eq(schema.jobPostings.job_id, id));
    return { message: 'Vacancy deleted successfully' };
  }

  async getVacancyApplications(jobId: string) {
    return this.db
      .select({
        application: schema.jobApplications,
        employee: schema.employees,
      })
      .from(schema.jobApplications)
      .innerJoin(schema.employees, eq(schema.jobApplications.emp_id, schema.employees.employee_id))
      .where(eq(schema.jobApplications.job_id, jobId));
  }

  async createCandidate(dto: { full_name: string; email: string; phone?: string; resume_url?: string }) {
    return this.db
      .insert(schema.candidates)
      .values({
        full_name: dto.full_name,
        email: dto.email,
        phone: dto.phone || null,
        resume_url: dto.resume_url || null,
      })
      .returning();
  }

  async deleteCandidate(id: string) {
    await this.db.delete(schema.candidates).where(eq(schema.candidates.candidate_id, id));
    return { message: 'Candidate deleted successfully' };
  }

  async createInterview(
    userId: string,
    dto: {
      application_id?: string;
      candidate_id?: string;
      interview_by?: string;
      interview_date: string;
      notes?: string;
    },
  ) {
    const interviewDate = new Date(dto.interview_date);

    // Business rule: no conflicts for the same interviewer or candidate
    const [conflict] = await this.db
      .select()
      .from(schema.interviews)
      .where(
        and(
          eq(schema.interviews.interview_date, interviewDate),
          or(
            dto.interview_by ? eq(schema.interviews.interview_by, dto.interview_by) : undefined,
            dto.application_id ? eq(schema.interviews.application_id, dto.application_id) : undefined,
            dto.candidate_id ? eq(schema.interviews.candidate_id, dto.candidate_id) : undefined,
          )!,
        ),
      );

    if (conflict) {
      throw new ConflictException('Interview scheduling conflict for interviewer or candidate at this time');
    }

    return this.db
      .insert(schema.interviews)
      .values({
        application_id: dto.application_id || null,
        candidate_id: dto.candidate_id || null,
        hr_id: userId,
        interview_by: dto.interview_by || null,
        interview_date: interviewDate,
        notes: dto.notes || null,
        status: 'SCHEDULED',
      })
      .returning();
  }

  async updateInterview(id: string, dto: any) {
    return this.db.update(schema.interviews).set(dto).where(eq(schema.interviews.interview_id, id)).returning();
  }

  // -------------------------------------------------------------
  // 11. Notifications
  // -------------------------------------------------------------
  async getNotifications() {
    return this.notificationsService.getForUser({ userId: '', role: 'hr' }, { page: 1, pageSize: 50 });
  }

  async createNotification(dto: any) {
    return this.notificationsService.create(dto);
  }

  async updateNotification(id: string, dto: any) {
    return this.db.update(schema.notifications).set(dto).where(eq(schema.notifications.id, id)).returning();
  }

  async deleteNotification(id: string) {
    await this.db.delete(schema.notifications).where(eq(schema.notifications.id, id));
    return { message: 'Notification deleted successfully' };
  }

  // -------------------------------------------------------------
  // 12. Reports
  // -------------------------------------------------------------
  async generateReport(
    userId: string,
    type: string,
    query?: { employeeId?: string; departmentId?: string; periodStart?: string; periodEnd?: string; format?: string },
  ) {
    const reportType = type.toUpperCase();
    let data: any = {};

    if (reportType === 'ATTENDANCE') {
      data = await this.getAttendance({ empId: query?.employeeId });
    } else if (reportType === 'PERFORMANCE') {
      data = await this.getPerformanceReviews();
    } else if (reportType === 'EMPLOYEE' || reportType === 'EMPLOYEES') {
      data = await this.getEmployees();
    } else if (reportType === 'TRAINING') {
      data = await this.getTrainings();
    } else if (reportType === 'LEAVE') {
      data = await this.getLeaves();
    } else if (reportType === 'PRODUCTION') {
      data = await this.getProduction();
    } else if (reportType === 'SALARY') {
      data = await this.getSalaryReports();
    }

    const [savedReport] = await this.db
      .insert(schema.reports)
      .values({
        hr_id: userId,
        report_type: reportType,
        period_start: query?.periodStart || null,
        period_end: query?.periodEnd || null,
        file_path: null,
      })
      .returning();

    return {
      report: savedReport,
      format: query?.format || 'json',
      data,
    };
  }

  async getReportsHistory() {
    return this.db.select().from(schema.reports).orderBy(desc(schema.reports.generated_date));
  }

  // -------------------------------------------------------------
  // 13. Account Requests (to Admin)
  // -------------------------------------------------------------
  async createAccountRequest(
    userId: string,
    dto: { request_type: 'ACCOUNT_CREATE' | 'ACCOUNT_DEACTIVATE' | 'ROLE_CHANGE'; target_emp_id?: string; request_data: any; reason: string },
  ) {
    const [req] = await this.db
      .insert(schema.requests)
      .values({
        request_type: dto.request_type,
        requested_by: userId,
        target_emp_id: dto.target_emp_id || null,
        request_data: dto.request_data || {},
        reason: dto.reason,
        status: 'PENDING',
      })
      .returning();

    // Notify Admin
    await this.notificationsService.create({
      recipient_role: 'admin',
      title: `HR Account Request: ${dto.request_type}`,
      message: `HR requested ${dto.request_type}. Reason: ${dto.reason}`,
      type: 'REQUEST',
      data: { requestId: req.request_id },
    });

    return req;
  }
}
