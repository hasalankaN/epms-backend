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
import { eq, and, or, inArray, desc, sql, SQL } from 'drizzle-orm';
import * as schema from '../database/schema';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SupervisorService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: NodePgDatabase<typeof schema>,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Resolves the supervisor's employee record.
   */
  async getSupervisorEmployee(userId: string) {
    const [employee] = await this.db
      .select()
      .from(schema.employees)
      .where(eq(schema.employees.user_id, userId));

    if (!employee) {
      throw new NotFoundException('Supervisor employee profile not found');
    }
    return employee;
  }

  /**
   * Helper to get list of employee IDs in supervisor's team.
   */
  async getTeamEmployeeIds(supervisorEmpId: string): Promise<string[]> {
    const members = await this.db
      .select({ employee_id: schema.employees.employee_id })
      .from(schema.employees)
      .where(eq(schema.employees.supervisor_id, supervisorEmpId));

    return members.map((m) => m.employee_id);
  }

  // -------------------------------------------------------------
  // Profile
  // -------------------------------------------------------------
  async getProfile(userId: string) {
    const employee = await this.getSupervisorEmployee(userId);
    const [supProfile] = await this.db
      .select()
      .from(schema.supervisors)
      .where(eq(schema.supervisors.emp_id, employee.employee_id));

    return {
      employee,
      supervisor_details: supProfile || null,
    };
  }

  async updateProfile(userId: string, updateData: any) {
    const employee = await this.getSupervisorEmployee(userId);

    const [updatedEmp] = await this.db
      .update(schema.employees)
      .set({
        contact: updateData.contact || employee.mobile_no,
        mobile_no: updateData.mobile_no || employee.mobile_no,
        personal_email: updateData.personal_email || employee.personal_email,
        street: updateData.street || employee.street,
        city: updateData.city || employee.city,
        province: updateData.province || employee.province,
        updated_at: new Date(),
      })
      .where(eq(schema.employees.employee_id, employee.employee_id))
      .returning();

    if (updateData.description) {
      const [existingSup] = await this.db
        .select()
        .from(schema.supervisors)
        .where(eq(schema.supervisors.emp_id, employee.employee_id));

      if (existingSup) {
        await this.db
          .update(schema.supervisors)
          .set({ description: updateData.description })
          .where(eq(schema.supervisors.supervisor_id, existingSup.supervisor_id));
      } else {
        await this.db
          .insert(schema.supervisors)
          .values({
            emp_id: employee.employee_id,
            description: updateData.description,
          });
      }
    }

    return updatedEmp;
  }

  // -------------------------------------------------------------
  // Team
  // -------------------------------------------------------------
  async getTeam(userId: string) {
    const supervisor = await this.getSupervisorEmployee(userId);

    return this.db
      .select({
        employee: schema.employees,
        department: schema.departments,
        position: schema.positions,
        user: {
          user_id: schema.users.user_id,
          email: schema.users.email,
          status: schema.users.status,
        },
      })
      .from(schema.employees)
      .leftJoin(schema.departments, eq(schema.employees.departmentId, schema.departments.departmentId))
      .leftJoin(schema.positions, eq(schema.employees.position_id, schema.positions.position_id))
      .leftJoin(schema.users, eq(schema.employees.user_id, schema.users.user_id))
      .where(eq(schema.employees.supervisor_id, supervisor.employee_id));
  }

  async getTeamMember(userId: string, empId: string) {
    const supervisor = await this.getSupervisorEmployee(userId);

    const [member] = await this.db
      .select({
        employee: schema.employees,
        department: schema.departments,
        position: schema.positions,
        user: {
          user_id: schema.users.user_id,
          email: schema.users.email,
          status: schema.users.status,
        },
      })
      .from(schema.employees)
      .leftJoin(schema.departments, eq(schema.employees.departmentId, schema.departments.departmentId))
      .leftJoin(schema.positions, eq(schema.employees.position_id, schema.positions.position_id))
      .leftJoin(schema.users, eq(schema.employees.user_id, schema.users.user_id))
      .where(
        and(
          eq(schema.employees.employee_id, empId),
          eq(schema.employees.supervisor_id, supervisor.employee_id),
        ),
      );

    if (!member) {
      throw new NotFoundException('Team member not found under your supervision');
    }

    const [contacts, qualifications, dependents, experiences] = await Promise.all([
      this.db.select().from(schema.empEmergencyContacts).where(eq(schema.empEmergencyContacts.employee_id, empId)),
      this.db.select().from(schema.empQualifications).where(eq(schema.empQualifications.employee_id, empId)),
      this.db.select().from(schema.empDependents).where(eq(schema.empDependents.employee_id, empId)),
      this.db.select().from(schema.workExperiences).where(eq(schema.workExperiences.employee_id, empId)),
    ]);

    return {
      ...member,
      emergency_contacts: contacts,
      qualifications,
      dependents,
      work_experiences: experiences,
    };
  }

  async updateTeamMember(userId: string, empId: string, updateData: any) {
    const supervisor = await this.getSupervisorEmployee(userId);

    const [existing] = await this.db
      .select()
      .from(schema.employees)
      .where(
        and(
          eq(schema.employees.employee_id, empId),
          eq(schema.employees.supervisor_id, supervisor.employee_id),
        ),
      );

    if (!existing) {
      throw new NotFoundException('Team member not found under your supervision');
    }

    const [updated] = await this.db
      .update(schema.employees)
      .set({
        first_name: updateData.first_name || existing.first_name,
        last_name: updateData.last_name || existing.last_name,
        mobile_no: updateData.mobile_no || existing.mobile_no,
        street: updateData.street || existing.street,
        city: updateData.city || existing.city,
        province: updateData.province || existing.province,
        updated_at: new Date(),
      })
      .where(eq(schema.employees.employee_id, empId))
      .returning();

    return updated;
  }

  async deleteTeamMember(userId: string, empId: string) {
    const supervisor = await this.getSupervisorEmployee(userId);

    const [existing] = await this.db
      .select()
      .from(schema.employees)
      .where(
        and(
          eq(schema.employees.employee_id, empId),
          eq(schema.employees.supervisor_id, supervisor.employee_id),
        ),
      );

    if (!existing) {
      throw new NotFoundException('Team member not found under your supervision');
    }

    // Remove from supervisor's team
    const [updated] = await this.db
      .update(schema.employees)
      .set({ supervisor_id: null, updated_at: new Date() })
      .where(eq(schema.employees.employee_id, empId))
      .returning();

    return { message: 'Employee removed from team', employee: updated };
  }

  // -------------------------------------------------------------
  // Leaves
  // -------------------------------------------------------------
  async getTeamLeaves(userId: string, status?: string) {
    const supervisor = await this.getSupervisorEmployee(userId);
    const teamIds = await this.getTeamEmployeeIds(supervisor.employee_id);

    if (teamIds.length === 0) {
      return [];
    }

    const conditions: SQL[] = [inArray(schema.leaves.emp_id, teamIds)];
    if (status) {
      conditions.push(eq(schema.leaves.status, status.toUpperCase()));
    }

    const leaveRows = await this.db
      .select({
        leave: schema.leaves,
        employee: {
          employee_id: schema.employees.employee_id,
          employee_no: schema.employees.employee_no,
          first_name: schema.employees.first_name,
          last_name: schema.employees.last_name,
          work_email: schema.employees.work_email,
        },
      })
      .from(schema.leaves)
      .innerJoin(schema.employees, eq(schema.leaves.emp_id, schema.employees.employee_id))
      .where(and(...conditions))
      .orderBy(desc(schema.leaves.created_at));

    // Attach leave balances for each
    const enriched = await Promise.all(
      leaveRows.map(async (row) => {
        const year = new Date(row.leave.start_date).getFullYear();
        const [bal] = await this.db
          .select()
          .from(schema.leaveBalances)
          .where(
            and(
              eq(schema.leaveBalances.emp_id, row.leave.emp_id),
              eq(schema.leaveBalances.leave_type, row.leave.leave_type),
              eq(schema.leaveBalances.year, year),
            ),
          );

        return {
          ...row,
          balance_info: bal || { balance: '0', used: '0', pending: '0' },
        };
      }),
    );

    return enriched;
  }

  async decideLeave(
    userId: string,
    leaveId: string,
    dto: { decision: 'APPROVED' | 'REJECTED' | 'ESCALATED'; comment?: string; escalate?: boolean },
  ) {
    const supervisor = await this.getSupervisorEmployee(userId);

    const [leave] = await this.db
      .select()
      .from(schema.leaves)
      .where(eq(schema.leaves.leave_id, leaveId));

    if (!leave) {
      throw new NotFoundException('Leave request not found');
    }

    // Verify employee is in supervisor's team
    const [emp] = await this.db
      .select()
      .from(schema.employees)
      .where(
        and(
          eq(schema.employees.employee_id, leave.emp_id),
          eq(schema.employees.supervisor_id, supervisor.employee_id),
        ),
      );

    if (!emp) {
      throw new ForbiddenException('Leave request is not from your team');
    }

    const isEscalation = dto.escalate || dto.decision === 'ESCALATED';
    const finalDecision = isEscalation ? 'ESCALATED' : dto.decision;
    const leaveDays = Number(leave.days);
    const year = new Date(leave.start_date).getFullYear();

    // Business rule:
    // approval deducts the balance (used += days, pending -= days)
    // rejection releases pending days (pending -= days)
    // escalate sends to HR
    // Both the balance update AND the leave-status update must succeed together → transaction
    const [balanceRecord] = await this.db
      .select()
      .from(schema.leaveBalances)
      .where(
        and(
          eq(schema.leaveBalances.emp_id, leave.emp_id),
          eq(schema.leaveBalances.leave_type, leave.leave_type),
          eq(schema.leaveBalances.year, year),
        ),
      );

    const updatedLeave = await this.db.transaction(async (tx) => {
      if (balanceRecord) {
        if (finalDecision === 'APPROVED') {
          await tx
            .update(schema.leaveBalances)
            .set({
              used: sql`GREATEST(0, ${schema.leaveBalances.used} + ${leaveDays})`,
              pending: sql`GREATEST(0, ${schema.leaveBalances.pending} - ${leaveDays})`,
            })
            .where(eq(schema.leaveBalances.balance_id, balanceRecord.balance_id));
        } else if (finalDecision === 'REJECTED') {
          await tx
            .update(schema.leaveBalances)
            .set({
              pending: sql`GREATEST(0, ${schema.leaveBalances.pending} - ${leaveDays})`,
            })
            .where(eq(schema.leaveBalances.balance_id, balanceRecord.balance_id));
        }
      }

      const [updated] = await tx
        .update(schema.leaves)
        .set({
          status: finalDecision,
          approved_by: userId,
          approval_date: new Date(),
          decision_comment: dto.comment || null,
        })
        .where(eq(schema.leaves.leave_id, leaveId))
        .returning();

      return updated;
    });

    // Notify employee
    if (emp.user_id) {
      await this.notificationsService.create({
        recipient_id: emp.user_id,
        title: `Leave Request ${finalDecision}`,
        message: `Your ${leave.leave_type} leave from ${leave.start_date} to ${leave.end_date} was ${finalDecision.toLowerCase()} by your supervisor.`,
        type: 'LEAVE',
        data: { leaveId: leave.leave_id, decision: finalDecision },
      });
    }

    // If escalated, notify HR
    if (finalDecision === 'ESCALATED') {
      await this.notificationsService.create({
        recipient_role: 'hr',
        title: 'Leave Request Escalated',
        message: `Supervisor escalated leave request for ${emp.first_name} ${emp.last_name}.`,
        type: 'LEAVE',
        data: { leaveId: leave.leave_id, employeeId: emp.employee_id },
      });
    }

    return updatedLeave;
  }

  // -------------------------------------------------------------
  // Team Member Self Evaluation & Performance
  // -------------------------------------------------------------
  async getTeamMemberSelfEvaluation(userId: string, empId: string) {
    const supervisor = await this.getSupervisorEmployee(userId);

    const [emp] = await this.db
      .select()
      .from(schema.employees)
      .where(
        and(
          eq(schema.employees.employee_id, empId),
          eq(schema.employees.supervisor_id, supervisor.employee_id),
        ),
      );

    if (!emp) {
      throw new NotFoundException('Team member not found under your supervision');
    }

    const [evaluations, attendanceHistory] = await Promise.all([
      this.db
        .select()
        .from(schema.selfEvaluations)
        .where(eq(schema.selfEvaluations.emp_id, empId))
        .orderBy(desc(schema.selfEvaluations.date)),
      this.db
        .select()
        .from(schema.attendance)
        .where(eq(schema.attendance.emp_id, empId))
        .orderBy(desc(schema.attendance.date))
        .limit(30),
    ]);

    return {
      employee: emp,
      self_evaluations: evaluations,
      recent_attendance: attendanceHistory,
    };
  }

  async submitPerformanceEvaluation(
    userId: string,
    dto: {
      emp_id: string;
      period?: string;
      quarter?: string;
      rating: number;
      comments: string;
      final_status?: string;
    },
  ) {
    const supervisor = await this.getSupervisorEmployee(userId);

    const [emp] = await this.db
      .select()
      .from(schema.employees)
      .where(
        and(
          eq(schema.employees.employee_id, dto.emp_id),
          eq(schema.employees.supervisor_id, supervisor.employee_id),
        ),
      );

    if (!emp) {
      throw new NotFoundException('Employee not found in your team');
    }

    // 1. If self evaluation exists for the period, update it
    if (dto.period) {
      const [existingEval] = await this.db
        .select()
        .from(schema.selfEvaluations)
        .where(
          and(
            eq(schema.selfEvaluations.emp_id, dto.emp_id),
            eq(schema.selfEvaluations.period, dto.period),
          ),
        );

      if (existingEval) {
        await this.db
          .update(schema.selfEvaluations)
          .set({
            supervisor_review: dto.comments,
            supervisor_rating: String(dto.rating),
            final_status: dto.final_status || 'SUPERVISOR_REVIEWED',
          })
          .where(eq(schema.selfEvaluations.evaluation_id, existingEval.evaluation_id));
      }
    }

    // 2. Also record in performance_reviews
    const quarter = dto.quarter || dto.period || `Q${Math.ceil((new Date().getMonth() + 1) / 3)}-${new Date().getFullYear()}`;
    const [review] = await this.db
      .insert(schema.performanceReviews)
      .values({
        emp_id: dto.emp_id,
        reviewer_id: userId,
        quarter,
        rating: String(dto.rating),
        comments: dto.comments,
      })
      .returning();

    // Notify employee
    if (emp.user_id) {
      await this.notificationsService.create({
        recipient_id: emp.user_id,
        title: 'Performance Review Completed',
        message: `Your supervisor submitted a performance review (${quarter}) with rating: ${dto.rating}.`,
        type: 'EVALUATION',
        data: { reviewId: review.review_id },
      });
    }

    return review;
  }

  async scheduleEvaluationMeeting(
    userId: string,
    dto: { emp_id: string; scheduled_at: string; location?: string; notes?: string },
  ) {
    const supervisor = await this.getSupervisorEmployee(userId);

    const [emp] = await this.db
      .select()
      .from(schema.employees)
      .where(
        and(
          eq(schema.employees.employee_id, dto.emp_id),
          eq(schema.employees.supervisor_id, supervisor.employee_id),
        ),
      );

    if (!emp) {
      throw new NotFoundException('Employee not found in your team');
    }

    const meetingDate = new Date(dto.scheduled_at);

    // Business rule: conflict check for supervisor and employee
    const [conflict] = await this.db
      .select()
      .from(schema.evaluationMeetings)
      .where(
        and(
          or(
            eq(schema.evaluationMeetings.supervisor_id, supervisor.employee_id),
            eq(schema.evaluationMeetings.emp_id, dto.emp_id),
          ),
          eq(schema.evaluationMeetings.scheduled_at, meetingDate),
        ),
      );

    if (conflict) {
      throw new ConflictException('Conflict: Meeting already scheduled for this supervisor or employee at this time');
    }

    const [meeting] = await this.db
      .insert(schema.evaluationMeetings)
      .values({
        emp_id: dto.emp_id,
        supervisor_id: supervisor.employee_id,
        scheduled_at: meetingDate,
        location: dto.location || null,
        notes: dto.notes || null,
      })
      .returning();

    // Notify employee
    if (emp.user_id) {
      await this.notificationsService.create({
        recipient_id: emp.user_id,
        title: 'Evaluation Meeting Scheduled',
        message: `An evaluation meeting has been scheduled with your supervisor for ${dto.scheduled_at}.`,
        type: 'EVALUATION',
        data: { meetingId: meeting.meeting_id },
      });
    }

    return meeting;
  }

  // -------------------------------------------------------------
  // Training Attendance
  // -------------------------------------------------------------
  async getTeamTrainingAttendance(userId: string) {
    const supervisor = await this.getSupervisorEmployee(userId);
    const teamIds = await this.getTeamEmployeeIds(supervisor.employee_id);

    if (teamIds.length === 0) {
      return [];
    }

    return this.db
      .select({
        participant: schema.trainingParticipants,
        training: schema.trainings,
        employee: {
          employee_id: schema.employees.employee_id,
          first_name: schema.employees.first_name,
          last_name: schema.employees.last_name,
          employee_no: schema.employees.employee_no,
        },
      })
      .from(schema.trainingParticipants)
      .innerJoin(schema.trainings, eq(schema.trainingParticipants.training_id, schema.trainings.training_id))
      .innerJoin(schema.employees, eq(schema.trainingParticipants.emp_id, schema.employees.employee_id))
      .where(inArray(schema.trainingParticipants.emp_id, teamIds))
      .orderBy(desc(schema.trainings.scheduled_date));
  }

  // -------------------------------------------------------------
  // Attendance Management
  // -------------------------------------------------------------
  async getTeamAttendance(userId: string, date?: string) {
    const supervisor = await this.getSupervisorEmployee(userId);
    const teamIds = await this.getTeamEmployeeIds(supervisor.employee_id);

    if (teamIds.length === 0) {
      return [];
    }

    const conditions: SQL[] = [inArray(schema.attendance.emp_id, teamIds)];
    if (date) {
      conditions.push(eq(schema.attendance.date, date));
    }

    return this.db
      .select({
        attendance: schema.attendance,
        employee: {
          employee_id: schema.employees.employee_id,
          first_name: schema.employees.first_name,
          last_name: schema.employees.last_name,
          employee_no: schema.employees.employee_no,
        },
      })
      .from(schema.attendance)
      .innerJoin(schema.employees, eq(schema.attendance.emp_id, schema.employees.employee_id))
      .where(and(...conditions))
      .orderBy(desc(schema.attendance.date));
  }

  async editAttendanceRecord(userId: string, attendanceId: string, updateData: any) {
    const supervisor = await this.getSupervisorEmployee(userId);
    const teamIds = await this.getTeamEmployeeIds(supervisor.employee_id);

    const [record] = await this.db
      .select()
      .from(schema.attendance)
      .where(
        and(
          eq(schema.attendance.attendance_id, attendanceId),
          inArray(schema.attendance.emp_id, teamIds),
        ),
      );

    if (!record) {
      throw new NotFoundException('Attendance record not found for your team');
    }

    const [updated] = await this.db
      .update(schema.attendance)
      .set({
        punch_in: updateData.punch_in || record.punch_in,
        punch_out: updateData.punch_out || record.punch_out,
        in_late: updateData.in_late !== undefined ? updateData.in_late : record.in_late,
        early_departure: updateData.early_departure !== undefined ? updateData.early_departure : record.early_departure,
        break_hours: updateData.break_hours !== undefined ? String(updateData.break_hours) : record.break_hours,
        work_hours: updateData.work_hours !== undefined ? String(updateData.work_hours) : record.work_hours,
        status: updateData.status || record.status,
      })
      .where(eq(schema.attendance.attendance_id, attendanceId))
      .returning();

    return updated;
  }

  async decideAttendanceAdjustment(
    userId: string,
    adjustmentId: string,
    dto: { decision: 'APPROVED' | 'REJECTED'; comment?: string },
  ) {
    const supervisor = await this.getSupervisorEmployee(userId);
    const teamIds = await this.getTeamEmployeeIds(supervisor.employee_id);

    const [adj] = await this.db
      .select()
      .from(schema.attendanceAdjustments)
      .where(
        and(
          eq(schema.attendanceAdjustments.adjustment_id, adjustmentId),
          inArray(schema.attendanceAdjustments.emp_id, teamIds),
        ),
      );

    if (!adj) {
      throw new NotFoundException('Adjustment request not found for your team');
    }

    const [updatedAdj] = await this.db
      .update(schema.attendanceAdjustments)
      .set({
        status: dto.decision,
        decided_by: userId,
        decision_date: new Date(),
        decision_comment: dto.comment || null,
      })
      .where(eq(schema.attendanceAdjustments.adjustment_id, adjustmentId))
      .returning();

    // If approved, update attendance punch in/out
    if (dto.decision === 'APPROVED') {
      const updates: any = {};
      if (adj.new_punch_in) updates.punch_in = adj.new_punch_in;
      if (adj.new_punch_out) updates.punch_out = adj.new_punch_out;

      if (Object.keys(updates).length > 0) {
        await this.db
          .update(schema.attendance)
          .set(updates)
          .where(eq(schema.attendance.attendance_id, adj.attendance_id));
      }
    }

    // Notify employee
    const [emp] = await this.db
      .select({ user_id: schema.employees.user_id })
      .from(schema.employees)
      .where(eq(schema.employees.employee_id, adj.emp_id));

    if (emp?.user_id) {
      await this.notificationsService.create({
        recipient_id: emp.user_id,
        title: `Attendance Adjustment ${dto.decision}`,
        message: `Your attendance adjustment request has been ${dto.decision.toLowerCase()}.`,
        type: 'ATTENDANCE',
        data: { adjustmentId },
      });
    }

    return updatedAdj;
  }

  // -------------------------------------------------------------
  // Tasks
  // -------------------------------------------------------------
  async assignTask(
    userId: string,
    dto: { emp_id: string; title: string; description?: string; due_date?: string },
  ) {
    const supervisor = await this.getSupervisorEmployee(userId);

    const [emp] = await this.db
      .select()
      .from(schema.employees)
      .where(
        and(
          eq(schema.employees.employee_id, dto.emp_id),
          eq(schema.employees.supervisor_id, supervisor.employee_id),
        ),
      );

    if (!emp) {
      throw new NotFoundException('Employee not found in your team');
    }

    const [task] = await this.db
      .insert(schema.tasks)
      .values({
        emp_id: dto.emp_id,
        supervisor_id: supervisor.employee_id,
        title: dto.title,
        description: dto.description || null,
        due_date: dto.due_date || null,
        status: 'TODO',
      })
      .returning();

    // Notify employee
    if (emp.user_id) {
      await this.notificationsService.create({
        recipient_id: emp.user_id,
        title: 'New Task Assigned',
        message: `Your supervisor assigned you a task: ${dto.title}.`,
        type: 'TASK',
        data: { taskId: task.task_id },
      });
    }

    return task;
  }

  async updateTask(userId: string, taskId: string, updateData: any) {
    const supervisor = await this.getSupervisorEmployee(userId);

    const [task] = await this.db
      .select()
      .from(schema.tasks)
      .where(
        and(
          eq(schema.tasks.task_id, taskId),
          eq(schema.tasks.supervisor_id, supervisor.employee_id),
        ),
      );

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const [updated] = await this.db
      .update(schema.tasks)
      .set({
        title: updateData.title || task.title,
        description: updateData.description !== undefined ? updateData.description : task.description,
        due_date: updateData.due_date || task.due_date,
        status: updateData.status || task.status,
        updated_at: new Date(),
      })
      .where(eq(schema.tasks.task_id, taskId))
      .returning();

    return updated;
  }

  async deleteTask(userId: string, taskId: string) {
    const supervisor = await this.getSupervisorEmployee(userId);

    const [task] = await this.db
      .select()
      .from(schema.tasks)
      .where(
        and(
          eq(schema.tasks.task_id, taskId),
          eq(schema.tasks.supervisor_id, supervisor.employee_id),
        ),
      );

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.db.delete(schema.tasks).where(eq(schema.tasks.task_id, taskId));
    return { message: 'Task deleted successfully' };
  }

  // -------------------------------------------------------------
  // Production
  // -------------------------------------------------------------
  async getProduction(userId: string) {
    const supervisor = await this.getSupervisorEmployee(userId);
    const teamIds = await this.getTeamEmployeeIds(supervisor.employee_id);

    if (teamIds.length === 0) {
      return [];
    }

    return this.db
      .select({
        production: schema.production,
        employee: {
          employee_id: schema.employees.employee_id,
          first_name: schema.employees.first_name,
          last_name: schema.employees.last_name,
          employee_no: schema.employees.employee_no,
        },
      })
      .from(schema.production)
      .innerJoin(schema.employees, eq(schema.production.emp_id, schema.employees.employee_id))
      .where(inArray(schema.production.emp_id, teamIds))
      .orderBy(desc(schema.production.date));
  }

  async approveProduction(
    userId: string,
    productionId: string,
    dto: { approved_status: 'APPROVED' | 'REJECTED'; supervisor_comment?: string; rating?: number },
  ) {
    const supervisor = await this.getSupervisorEmployee(userId);
    const teamIds = await this.getTeamEmployeeIds(supervisor.employee_id);

    const [prod] = await this.db
      .select()
      .from(schema.production)
      .where(
        and(
          eq(schema.production.production_id, productionId),
          inArray(schema.production.emp_id, teamIds),
        ),
      );

    if (!prod) {
      throw new NotFoundException('Production record not found for your team');
    }

    const [updated] = await this.db
      .update(schema.production)
      .set({
        approved_status: dto.approved_status,
        supervisor_comment: dto.supervisor_comment || prod.supervisor_comment,
        rating: dto.rating !== undefined ? String(dto.rating) : prod.rating,
        supervisor_id: supervisor.employee_id,
      })
      .where(eq(schema.production.production_id, productionId))
      .returning();

    return updated;
  }
}
