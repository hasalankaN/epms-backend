import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, or, gte, lte, desc, sql, SQL, inArray } from 'drizzle-orm';
import * as schema from '../database/schema';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MeService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: NodePgDatabase<typeof schema>,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Helper to resolve the employee record corresponding to the authenticated user ID.
   */
  async getEmployeeByUserId(userId: string) {
    const [employee] = await this.db
      .select()
      .from(schema.employees)
      .where(eq(schema.employees.user_id, userId));

    if (!employee) {
      throw new NotFoundException('Employee profile not found for this account');
    }
    return employee;
  }

  // -------------------------------------------------------------
  // 1. Profile
  // -------------------------------------------------------------
  async getProfile(userId: string) {
    const employee = await this.getEmployeeByUserId(userId);

    const [dept] = employee.departmentId
      ? await this.db
          .select()
          .from(schema.departments)
          .where(eq(schema.departments.departmentId, employee.departmentId))
      : [null];

    const [pos] = employee.position_id
      ? await this.db
          .select()
          .from(schema.positions)
          .where(eq(schema.positions.position_id, employee.position_id))
      : [null];

    const [user] = await this.db
      .select({
        user_id: schema.users.user_id,
        email: schema.users.email,
        role: schema.users.role,
        status: schema.users.status,
      })
      .from(schema.users)
      .where(eq(schema.users.user_id, userId));

    const [experiences, qualifications, emergencyContacts, dependents] = await Promise.all([
      this.db
        .select()
        .from(schema.workExperiences)
        .where(eq(schema.workExperiences.employee_id, employee.employee_id)),
      this.db
        .select()
        .from(schema.empQualifications)
        .where(eq(schema.empQualifications.employee_id, employee.employee_id)),
      this.db
        .select()
        .from(schema.empEmergencyContacts)
        .where(eq(schema.empEmergencyContacts.employee_id, employee.employee_id)),
      this.db
        .select()
        .from(schema.empDependents)
        .where(eq(schema.empDependents.employee_id, employee.employee_id)),
    ]);

    return {
      employee,
      department: dept,
      position: pos,
      user,
      work_experiences: experiences,
      qualifications,
      emergency_contacts: emergencyContacts,
      dependents,
    };
  }

  async createProfileUpdateRequest(userId: string, updateData: any, reason?: string) {
    const employee = await this.getEmployeeByUserId(userId);

    const [request] = await this.db
      .insert(schema.requests)
      .values({
        request_type: 'PROFILE_UPDATE',
        requested_by: userId,
        target_emp_id: employee.employee_id,
        request_data: updateData,
        reason: reason || 'Employee profile update request',
        status: 'PENDING',
      })
      .returning();

    // Notify HR
    await this.notificationsService.create({
      recipient_role: 'hr',
      title: 'New Profile Update Request',
      message: `${employee.first_name} ${employee.last_name} submitted a profile update request.`,
      type: 'REQUEST',
      data: { requestId: request.request_id, employeeId: employee.employee_id },
    });

    return request;
  }

  async getProfileUpdateRequests(userId: string) {
    return this.db
      .select()
      .from(schema.requests)
      .where(
        and(
          eq(schema.requests.requested_by, userId),
          eq(schema.requests.request_type, 'PROFILE_UPDATE'),
        ),
      )
      .orderBy(desc(schema.requests.requested_date));
  }

  // -------------------------------------------------------------
  // 2. Leaves & Balances
  // -------------------------------------------------------------
  async submitLeave(
    userId: string,
    dto: { leave_type: string; start_date: string; end_date: string; days: number; reason?: string },
  ) {
    const employee = await this.getEmployeeByUserId(userId);

    if (new Date(dto.end_date) < new Date(dto.start_date)) {
      throw new BadRequestException('End date cannot be earlier than start date');
    }

    if (dto.days <= 0) {
      throw new BadRequestException('Leave days must be greater than 0');
    }

    const currentYear = new Date(dto.start_date).getFullYear();

    // Check for overlapping leaves
    const overlapping = await this.db
      .select()
      .from(schema.leaves)
      .where(
        and(
          eq(schema.leaves.emp_id, employee.employee_id),
          inArray(schema.leaves.status, ['PENDING', 'APPROVED', 'ESCALATED']),
          sql`${schema.leaves.start_date} <= ${dto.end_date} AND ${schema.leaves.end_date} >= ${dto.start_date}`,
        ),
      );

    if (overlapping.length > 0) {
      throw new BadRequestException('Leave request dates overlap with an existing pending or approved leave');
    }

    // Check leave balance (unless NO_PAY or SPECIAL if policy allows)
    const [balanceRecord] = await this.db
      .select()
      .from(schema.leaveBalances)
      .where(
        and(
          eq(schema.leaveBalances.emp_id, employee.employee_id),
          eq(schema.leaveBalances.leave_type, dto.leave_type),
          eq(schema.leaveBalances.year, currentYear),
        ),
      );

    if (balanceRecord) {
      const available = Number(balanceRecord.balance) - Number(balanceRecord.used) - Number(balanceRecord.pending);
      if (available < dto.days) {
        throw new BadRequestException(
          `Insufficient leave balance for ${dto.leave_type}. Available: ${available}, Requested: ${dto.days}`,
        );
      }

      // Mark pending days
      await this.db
        .update(schema.leaveBalances)
        .set({
          pending: sql`${schema.leaveBalances.pending} + ${dto.days}`,
        })
        .where(eq(schema.leaveBalances.balance_id, balanceRecord.balance_id));
    }

    const [leave] = await this.db
      .insert(schema.leaves)
      .values({
        emp_id: employee.employee_id,
        leave_type: dto.leave_type,
        start_date: dto.start_date,
        end_date: dto.end_date,
        days: String(dto.days),
        reason: dto.reason || '',
        status: 'PENDING',
      })
      .returning();

    // Notify Supervisor
    if (employee.supervisor_id) {
      const [supervisorEmp] = await this.db
        .select({ user_id: schema.employees.user_id })
        .from(schema.employees)
        .where(eq(schema.employees.employee_id, employee.supervisor_id));

      if (supervisorEmp?.user_id) {
        await this.notificationsService.create({
          recipient_id: supervisorEmp.user_id,
          title: 'New Leave Request',
          message: `${employee.first_name} ${employee.last_name} requested ${dto.days} day(s) of ${dto.leave_type} leave.`,
          type: 'LEAVE',
          data: { leaveId: leave.leave_id, employeeId: employee.employee_id },
        });
      }
    }

    return leave;
  }

  async getLeaves(userId: string) {
    const employee = await this.getEmployeeByUserId(userId);
    return this.db
      .select()
      .from(schema.leaves)
      .where(eq(schema.leaves.emp_id, employee.employee_id))
      .orderBy(desc(schema.leaves.start_date));
  }

  async getLeaveBalances(userId: string) {
    const employee = await this.getEmployeeByUserId(userId);
    const currentYear = new Date().getFullYear();
    return this.db
      .select()
      .from(schema.leaveBalances)
      .where(
        and(
          eq(schema.leaveBalances.emp_id, employee.employee_id),
          eq(schema.leaveBalances.year, currentYear),
        ),
      );
  }

  // -------------------------------------------------------------
  // 3. Attendance
  // -------------------------------------------------------------
  async clockIn(userId: string) {
    const employee = await this.getEmployeeByUserId(userId);
    const today = new Date().toISOString().slice(0, 10);
    const nowTime = new Date().toTimeString().slice(0, 8); // HH:mm:ss

    // Check if attendance record already exists for today
    const [existing] = await this.db
      .select()
      .from(schema.attendance)
      .where(and(eq(schema.attendance.emp_id, employee.employee_id), eq(schema.attendance.date, today)));

    if (existing && existing.punch_in) {
      throw new ConflictException('Already clocked in for today');
    }

    // Configured start time: 09:00:00
    const [confHours, confMinutes] = [9, 0];
    const [nowHours, nowMinutes] = nowTime.split(':').map(Number);
    const lateMinutes = (nowHours * 60 + nowMinutes) - (confHours * 60 + confMinutes);
    const inLate = lateMinutes > 0;

    if (existing) {
      const [updated] = await this.db
        .update(schema.attendance)
        .set({
          punch_in: nowTime,
          in_late: inLate,
          total_late_min: inLate ? lateMinutes : 0,
          status: 'PRESENT',
        })
        .where(eq(schema.attendance.attendance_id, existing.attendance_id))
        .returning();
      return updated;
    }

    const [created] = await this.db
      .insert(schema.attendance)
      .values({
        emp_id: employee.employee_id,
        date: today,
        punch_in: nowTime,
        in_late: inLate,
        total_late_min: inLate ? lateMinutes : 0,
        status: 'PRESENT',
      })
      .returning();

    return created;
  }

  async clockOut(userId: string) {
    const employee = await this.getEmployeeByUserId(userId);
    const today = new Date().toISOString().slice(0, 10);
    const nowTime = new Date().toTimeString().slice(0, 8);

    const [record] = await this.db
      .select()
      .from(schema.attendance)
      .where(and(eq(schema.attendance.emp_id, employee.employee_id), eq(schema.attendance.date, today)));

    if (!record || !record.punch_in) {
      throw new BadRequestException('Cannot clock out without clocking in first');
    }

    if (record.punch_out) {
      throw new BadRequestException('Already clocked out for today');
    }

    // Calculate work hours: out - in - breakHours
    const [inH, inM, inS] = record.punch_in.split(':').map(Number);
    const [outH, outM, outS] = nowTime.split(':').map(Number);
    const inTotalHours = inH + inM / 60 + (inS || 0) / 3600;
    const outTotalHours = outH + outM / 60 + (outS || 0) / 3600;
    const breakHours = Number(record.break_hours) || 0;
    const workHours = Math.max(0, Number((outTotalHours - inTotalHours - breakHours).toFixed(2)));

    // Early departure if out before 17:00:00
    const earlyDeparture = outTotalHours < 17;

    const [updated] = await this.db
      .update(schema.attendance)
      .set({
        punch_out: nowTime,
        work_hours: String(workHours),
        early_departure: earlyDeparture,
      })
      .where(eq(schema.attendance.attendance_id, record.attendance_id))
      .returning();

    return updated;
  }

  async getAttendanceHistory(userId: string, filters?: { late?: boolean; earlyDeparture?: boolean; absent?: boolean }) {
    const employee = await this.getEmployeeByUserId(userId);
    const conditions: SQL[] = [eq(schema.attendance.emp_id, employee.employee_id)];

    if (filters?.late) {
      conditions.push(eq(schema.attendance.in_late, true));
    }
    if (filters?.earlyDeparture) {
      conditions.push(eq(schema.attendance.early_departure, true));
    }
    if (filters?.absent) {
      conditions.push(eq(schema.attendance.status, 'ABSENT'));
    }

    return this.db
      .select()
      .from(schema.attendance)
      .where(and(...conditions))
      .orderBy(desc(schema.attendance.date));
  }

  async requestAttendanceAdjustment(
    userId: string,
    dto: { attendance_id: string; new_punch_in?: string; new_punch_out?: string; reason: string },
  ) {
    const employee = await this.getEmployeeByUserId(userId);

    const [att] = await this.db
      .select()
      .from(schema.attendance)
      .where(
        and(
          eq(schema.attendance.attendance_id, dto.attendance_id),
          eq(schema.attendance.emp_id, employee.employee_id),
        ),
      );

    if (!att) {
      throw new NotFoundException('Attendance record not found');
    }

    const [adjustment] = await this.db
      .insert(schema.attendanceAdjustments)
      .values({
        attendance_id: dto.attendance_id,
        emp_id: employee.employee_id,
        new_punch_in: dto.new_punch_in,
        new_punch_out: dto.new_punch_out,
        reason: dto.reason,
        status: 'PENDING',
      })
      .returning();

    // Notify Supervisor
    if (employee.supervisor_id) {
      const [sup] = await this.db
        .select({ user_id: schema.employees.user_id })
        .from(schema.employees)
        .where(eq(schema.employees.employee_id, employee.supervisor_id));

      if (sup?.user_id) {
        await this.notificationsService.create({
          recipient_id: sup.user_id,
          title: 'Attendance Adjustment Request',
          message: `${employee.first_name} ${employee.last_name} requested an attendance adjustment.`,
          type: 'ATTENDANCE',
          data: { adjustmentId: adjustment.adjustment_id },
        });
      }
    }

    return adjustment;
  }

  // -------------------------------------------------------------
  // 4. Tasks
  // -------------------------------------------------------------
  async getTasks(userId: string) {
    const employee = await this.getEmployeeByUserId(userId);
    return this.db
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.emp_id, employee.employee_id))
      .orderBy(desc(schema.tasks.created_at));
  }

  async updateTaskStatus(userId: string, taskId: string, status: string) {
    const employee = await this.getEmployeeByUserId(userId);
    const validStatuses = ['TODO', 'IN_PROGRESS', 'DONE', 'OVERDUE'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`Status must be one of: ${validStatuses.join(', ')}`);
    }

    const [updated] = await this.db
      .update(schema.tasks)
      .set({ status, updated_at: new Date() })
      .where(and(eq(schema.tasks.task_id, taskId), eq(schema.tasks.emp_id, employee.employee_id)))
      .returning();

    if (!updated) {
      throw new NotFoundException('Task not found or not assigned to you');
    }
    return updated;
  }

  // -------------------------------------------------------------
  // 5. Production
  // -------------------------------------------------------------
  async getProduction(userId: string) {
    const employee = await this.getEmployeeByUserId(userId);
    return this.db
      .select()
      .from(schema.production)
      .where(eq(schema.production.emp_id, employee.employee_id))
      .orderBy(desc(schema.production.date));
  }

  // -------------------------------------------------------------
  // 6. Trainings
  // -------------------------------------------------------------
  async getTrainings(userId: string) {
    const employee = await this.getEmployeeByUserId(userId);

    return this.db
      .select({
        training: schema.trainings,
        participant: schema.trainingParticipants,
      })
      .from(schema.trainingParticipants)
      .innerJoin(schema.trainings, eq(schema.trainingParticipants.training_id, schema.trainings.training_id))
      .where(eq(schema.trainingParticipants.emp_id, employee.employee_id))
      .orderBy(desc(schema.trainings.scheduled_date));
  }

  async getTrainingMaterials(userId: string, trainingId: string) {
    const employee = await this.getEmployeeByUserId(userId);

    // Verify participation
    const [p] = await this.db
      .select()
      .from(schema.trainingParticipants)
      .where(
        and(
          eq(schema.trainingParticipants.training_id, trainingId),
          eq(schema.trainingParticipants.emp_id, employee.employee_id),
        ),
      );

    if (!p) {
      throw new ForbiddenException('You are not registered for this training');
    }

    return this.db
      .select()
      .from(schema.trainingMaterials)
      .where(eq(schema.trainingMaterials.training_id, trainingId));
  }

  async submitTrainingEvaluation(
    userId: string,
    trainingId: string,
    dto: { rating: number; evaluation: string },
  ) {
    const employee = await this.getEmployeeByUserId(userId);

    const [training] = await this.db
      .select()
      .from(schema.trainings)
      .where(eq(schema.trainings.training_id, trainingId));

    if (!training) {
      throw new NotFoundException('Training not found');
    }

    // Business rule: only participants, only after completion, once per training
    if (training.status !== 'COMPLETED') {
      throw new BadRequestException('Evaluations can only be submitted for COMPLETED trainings');
    }

    const [participant] = await this.db
      .select()
      .from(schema.trainingParticipants)
      .where(
        and(
          eq(schema.trainingParticipants.training_id, trainingId),
          eq(schema.trainingParticipants.emp_id, employee.employee_id),
        ),
      );

    if (!participant) {
      throw new ForbiddenException('Only registered participants can submit an evaluation');
    }

    if (participant.evaluated_at) {
      throw new BadRequestException('You have already submitted an evaluation for this training');
    }

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

  // -------------------------------------------------------------
  // 7. Salary & Slips
  // -------------------------------------------------------------
  async getSalary(userId: string) {
    const employee = await this.getEmployeeByUserId(userId);

    // Latest effective salary
    const today = new Date().toISOString().slice(0, 10);
    const [latestSalary] = await this.db
      .select()
      .from(schema.salaries)
      .where(
        and(
          eq(schema.salaries.emp_id, employee.employee_id),
          lte(schema.salaries.effective_date, today),
        ),
      )
      .orderBy(desc(schema.salaries.effective_date))
      .limit(1);

    if (!latestSalary) {
      return {
        basicSalary: 0,
        allowances: [],
        deductions: [],
        netSalary: 0,
      };
    }

    const [allowancesList, deductionsList] = await Promise.all([
      this.db
        .select()
        .from(schema.allowances)
        .where(eq(schema.allowances.salary_id, latestSalary.salary_id)),
      this.db
        .select()
        .from(schema.deductions)
        .where(eq(schema.deductions.salary_id, latestSalary.salary_id)),
    ]);

    const totalAllowances = allowancesList.reduce((acc, curr) => acc + Number(curr.amount), 0);
    const totalDeductions = deductionsList.reduce((acc, curr) => acc + Number(curr.amount), 0);
    const netSalary = Number(latestSalary.basic_salary) + totalAllowances - totalDeductions;

    return {
      basicSalary: Number(latestSalary.basic_salary),
      effectiveDate: latestSalary.effective_date,
      allowances: allowancesList,
      deductions: deductionsList,
      totalAllowances,
      totalDeductions,
      netSalary,
    };
  }

  async getSalarySlips(userId: string) {
    const employee = await this.getEmployeeByUserId(userId);
    return this.db
      .select()
      .from(schema.salarySlips)
      .where(eq(schema.salarySlips.emp_id, employee.employee_id))
      .orderBy(desc(schema.salarySlips.month));
  }

  async getSalarySlipById(userId: string, slipId: string) {
    const employee = await this.getEmployeeByUserId(userId);
    const [slip] = await this.db
      .select()
      .from(schema.salarySlips)
      .where(
        and(
          eq(schema.salarySlips.slip_id, slipId),
          eq(schema.salarySlips.emp_id, employee.employee_id),
        ),
      );

    if (!slip) {
      throw new NotFoundException('Salary slip not found');
    }
    return slip;
  }

  // -------------------------------------------------------------
  // 8. Recruitment (Job Postings & Applications)
  // -------------------------------------------------------------
  async getJobPostings() {
    return this.db
      .select({
        job: schema.jobPostings,
        department: schema.departments,
        position: schema.positions,
      })
      .from(schema.jobPostings)
      .leftJoin(schema.departments, eq(schema.jobPostings.dept_id, schema.departments.departmentId))
      .leftJoin(schema.positions, eq(schema.jobPostings.position_id, schema.positions.position_id))
      .where(eq(schema.jobPostings.status, 'OPEN'))
      .orderBy(desc(schema.jobPostings.posted_date));
  }

  async applyForJob(userId: string, jobId: string) {
    const employee = await this.getEmployeeByUserId(userId);

    const [job] = await this.db
      .select()
      .from(schema.jobPostings)
      .where(eq(schema.jobPostings.job_id, jobId));

    if (!job || job.status !== 'OPEN') {
      throw new BadRequestException('This job posting is not open for applications');
    }

    // Check closing date
    if (job.closing_date && new Date(job.closing_date) < new Date()) {
      throw new BadRequestException('Application period has closed for this vacancy');
    }

    // Check duplicate application
    const [existing] = await this.db
      .select()
      .from(schema.jobApplications)
      .where(
        and(
          eq(schema.jobApplications.job_id, jobId),
          eq(schema.jobApplications.emp_id, employee.employee_id),
        ),
      );

    if (existing) {
      throw new ConflictException('You have already applied for this position');
    }

    const [application] = await this.db
      .insert(schema.jobApplications)
      .values({
        job_id: jobId,
        emp_id: employee.employee_id,
        status: 'APPLIED',
      })
      .returning();

    return application;
  }

  async getApplications(userId: string) {
    const employee = await this.getEmployeeByUserId(userId);
    return this.db
      .select({
        application: schema.jobApplications,
        job: schema.jobPostings,
      })
      .from(schema.jobApplications)
      .innerJoin(schema.jobPostings, eq(schema.jobApplications.job_id, schema.jobPostings.job_id))
      .where(eq(schema.jobApplications.emp_id, employee.employee_id))
      .orderBy(desc(schema.jobApplications.applied_date));
  }

  async cancelApplication(userId: string, applicationId: string) {
    const employee = await this.getEmployeeByUserId(userId);

    const [existing] = await this.db
      .select()
      .from(schema.jobApplications)
      .where(
        and(
          eq(schema.jobApplications.application_id, applicationId),
          eq(schema.jobApplications.emp_id, employee.employee_id),
        ),
      );

    if (!existing) {
      throw new NotFoundException('Application not found');
    }

    if (existing.status === 'SELECTED' || existing.status === 'REJECTED') {
      throw new BadRequestException(`Cannot cancel application in ${existing.status} status`);
    }

    const [cancelled] = await this.db
      .update(schema.jobApplications)
      .set({ status: 'CANCELLED' })
      .where(eq(schema.jobApplications.application_id, applicationId))
      .returning();

    return cancelled;
  }

  // -------------------------------------------------------------
  // 9. Notifications (me/notifications)
  // -------------------------------------------------------------
  async getNotifications(userId: string, role?: string) {
    return this.notificationsService.getForUser({ userId, role }, { page: 1, pageSize: 50 });
  }

  async markNotificationRead(id: string) {
    return this.notificationsService.markAsRead(id);
  }

  async markAllNotificationsRead(userId: string, role?: string) {
    return this.notificationsService.markAllAsRead({ userId, role });
  }

  // -------------------------------------------------------------
  // 10. Performance & Self Evaluations
  // -------------------------------------------------------------
  async getCurrentSelfEvaluation(userId: string) {
    const employee = await this.getEmployeeByUserId(userId);
    // Find open / draft self evaluation
    const [evalForm] = await this.db
      .select()
      .from(schema.selfEvaluations)
      .where(
        and(
          eq(schema.selfEvaluations.emp_id, employee.employee_id),
          inArray(schema.selfEvaluations.final_status, ['DRAFT', 'SUBMITTED']),
        ),
      )
      .orderBy(desc(schema.selfEvaluations.date))
      .limit(1);

    return evalForm || { message: 'No open self evaluation form found' };
  }

  async submitSelfEvaluation(
    userId: string,
    dto: { period: string; employee_review: string; self_rating: number },
  ) {
    const employee = await this.getEmployeeByUserId(userId);

    // Check if evaluation already exists for this period
    const [existing] = await this.db
      .select()
      .from(schema.selfEvaluations)
      .where(
        and(
          eq(schema.selfEvaluations.emp_id, employee.employee_id),
          eq(schema.selfEvaluations.period, dto.period),
        ),
      );

    if (existing) {
      if (existing.final_status !== 'DRAFT') {
        throw new BadRequestException('Evaluation for this period is already submitted');
      }

      const [updated] = await this.db
        .update(schema.selfEvaluations)
        .set({
          employee_review: dto.employee_review,
          self_rating: String(dto.self_rating),
          final_status: 'SUBMITTED',
        })
        .where(eq(schema.selfEvaluations.evaluation_id, existing.evaluation_id))
        .returning();

      return updated;
    }

    const [created] = await this.db
      .insert(schema.selfEvaluations)
      .values({
        emp_id: employee.employee_id,
        period: dto.period,
        employee_review: dto.employee_review,
        self_rating: String(dto.self_rating),
        final_status: 'SUBMITTED',
      })
      .returning();

    return created;
  }

  async getPerformanceReviews(userId: string) {
    const employee = await this.getEmployeeByUserId(userId);
    return this.db
      .select()
      .from(schema.performanceReviews)
      .where(eq(schema.performanceReviews.emp_id, employee.employee_id))
      .orderBy(desc(schema.performanceReviews.date));
  }
}
