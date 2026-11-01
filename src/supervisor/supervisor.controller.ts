import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../common/enums/roles.enum';
import { SupervisorService } from './supervisor.service';

@ApiTags('supervisor')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPERVISOR, UserRole.ADMIN, UserRole.HR)
@Controller('supervisor')
export class SupervisorController {
  constructor(private readonly supervisorService: SupervisorService) {}

  // -------------------------------------------------------------
  // Profile
  // -------------------------------------------------------------
  @Get('profile')
  @ApiOperation({ summary: 'View supervisor own profile' })
  async getProfile(@Req() req: any) {
    const userId = req.user?.sub || req.user?.userId;
    return this.supervisorService.getProfile(userId);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Edit supervisor own profile' })
  async updateProfile(@Req() req: any, @Body() body: any) {
    const userId = req.user?.sub || req.user?.userId;
    return this.supervisorService.updateProfile(userId, body);
  }

  // -------------------------------------------------------------
  // Team
  // -------------------------------------------------------------
  @Get('team')
  @ApiOperation({ summary: 'Get team members' })
  async getTeam(@Req() req: any) {
    const userId = req.user?.sub || req.user?.userId;
    return this.supervisorService.getTeam(userId);
  }

  @Get('team/:empId')
  @ApiOperation({ summary: 'View employee data (within team)' })
  @ApiParam({ name: 'empId', description: 'Employee ID' })
  async getTeamMember(@Req() req: any, @Param('empId') empId: string) {
    const userId = req.user?.sub || req.user?.userId;
    return this.supervisorService.getTeamMember(userId, empId);
  }

  @Patch('team/:empId')
  @ApiOperation({ summary: 'Edit employee data (within team)' })
  @ApiParam({ name: 'empId', description: 'Employee ID' })
  async updateTeamMember(@Req() req: any, @Param('empId') empId: string, @Body() body: any) {
    const userId = req.user?.sub || req.user?.userId;
    return this.supervisorService.updateTeamMember(userId, empId, body);
  }

  @Delete('team/:empId')
  @ApiOperation({ summary: 'Delete employee data / remove from team' })
  @ApiParam({ name: 'empId', description: 'Employee ID' })
  async deleteTeamMember(@Req() req: any, @Param('empId') empId: string) {
    const userId = req.user?.sub || req.user?.userId;
    return this.supervisorService.deleteTeamMember(userId, empId);
  }

  @Get('team/:empId/self-evaluation')
  @ApiOperation({ summary: 'Employee self evaluation and attendance history' })
  @ApiParam({ name: 'empId', description: 'Employee ID' })
  async getTeamMemberSelfEvaluation(@Req() req: any, @Param('empId') empId: string) {
    const userId = req.user?.sub || req.user?.userId;
    return this.supervisorService.getTeamMemberSelfEvaluation(userId, empId);
  }

  // -------------------------------------------------------------
  // Leaves
  // -------------------------------------------------------------
  @Get('leaves')
  @ApiOperation({ summary: 'Team leave requests with balance validation result' })
  @ApiQuery({ name: 'status', required: false, type: String })
  async getLeaves(@Req() req: any, @Query('status') status?: string) {
    const userId = req.user?.sub || req.user?.userId;
    return this.supervisorService.getTeamLeaves(userId, status);
  }

  @Patch('leaves/:id/decision')
  @ApiOperation({ summary: 'Approve or reject leave; escalate: true sends to HR; updates balance; notifies employee' })
  @ApiParam({ name: 'id', description: 'Leave ID' })
  async decideLeave(
    @Req() req: any,
    @Param('id') leaveId: string,
    @Body() dto: { decision: 'APPROVED' | 'REJECTED' | 'ESCALATED'; comment?: string; escalate?: boolean },
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.supervisorService.decideLeave(userId, leaveId, dto);
  }

  // -------------------------------------------------------------
  // Performance
  // -------------------------------------------------------------
  @Post('performance-evaluations')
  @ApiOperation({ summary: 'Submit performance evaluation (rating, comments, final status)' })
  async submitPerformanceEvaluation(
    @Req() req: any,
    @Body()
    dto: {
      emp_id: string;
      period?: string;
      quarter?: string;
      rating: number;
      comments: string;
      final_status?: string;
    },
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.supervisorService.submitPerformanceEvaluation(userId, dto);
  }

  @Post('evaluation-meetings')
  @ApiOperation({ summary: 'Schedule evaluation meeting, conflict check, notify employee' })
  async scheduleEvaluationMeeting(
    @Req() req: any,
    @Body() dto: { emp_id: string; scheduled_at: string; location?: string; notes?: string },
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.supervisorService.scheduleEvaluationMeeting(userId, dto);
  }

  // -------------------------------------------------------------
  // Training
  // -------------------------------------------------------------
  @Get('trainings/attendance')
  @ApiOperation({ summary: 'Training attendance of team' })
  async getTrainingsAttendance(@Req() req: any) {
    const userId = req.user?.sub || req.user?.userId;
    return this.supervisorService.getTeamTrainingAttendance(userId);
  }

  // -------------------------------------------------------------
  // Attendance
  // -------------------------------------------------------------
  @Get('attendance')
  @ApiOperation({ summary: 'Team attendance' })
  @ApiQuery({ name: 'date', required: false, type: String })
  async getAttendance(@Req() req: any, @Query('date') date?: string) {
    const userId = req.user?.sub || req.user?.userId;
    return this.supervisorService.getTeamAttendance(userId, date);
  }

  @Patch('attendance/:id')
  @ApiOperation({ summary: 'Edit attendance record' })
  @ApiParam({ name: 'id', description: 'Attendance ID' })
  async editAttendanceRecord(@Req() req: any, @Param('id') attendanceId: string, @Body() body: any) {
    const userId = req.user?.sub || req.user?.userId;
    return this.supervisorService.editAttendanceRecord(userId, attendanceId, body);
  }

  @Patch('attendance/adjustments/:id')
  @ApiOperation({ summary: 'Approve or reject adjustment request' })
  @ApiParam({ name: 'id', description: 'Adjustment ID' })
  async decideAdjustment(
    @Req() req: any,
    @Param('id') adjustmentId: string,
    @Body() dto: { decision: 'APPROVED' | 'REJECTED'; comment?: string },
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.supervisorService.decideAttendanceAdjustment(userId, adjustmentId, dto);
  }

  // -------------------------------------------------------------
  // Tasks
  // -------------------------------------------------------------
  @Post('tasks')
  @ApiOperation({ summary: 'Assign task to employee' })
  async assignTask(
    @Req() req: any,
    @Body() dto: { emp_id: string; title: string; description?: string; due_date?: string },
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.supervisorService.assignTask(userId, dto);
  }

  @Patch('tasks/:id')
  @ApiOperation({ summary: 'Edit task' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  async updateTask(@Req() req: any, @Param('id') taskId: string, @Body() body: any) {
    const userId = req.user?.sub || req.user?.userId;
    return this.supervisorService.updateTask(userId, taskId, body);
  }

  @Delete('tasks/:id')
  @ApiOperation({ summary: 'Delete task' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  async deleteTask(@Req() req: any, @Param('id') taskId: string) {
    const userId = req.user?.sub || req.user?.userId;
    return this.supervisorService.deleteTask(userId, taskId);
  }

  // -------------------------------------------------------------
  // Production
  // -------------------------------------------------------------
  @Get('production')
  @ApiOperation({ summary: 'Review production' })
  async getProduction(@Req() req: any) {
    const userId = req.user?.sub || req.user?.userId;
    return this.supervisorService.getProduction(userId);
  }

  @Patch('production/:id/approval')
  @ApiOperation({ summary: 'Approve production, add supervisor comment and rating' })
  @ApiParam({ name: 'id', description: 'Production ID' })
  async approveProduction(
    @Req() req: any,
    @Param('id') productionId: string,
    @Body() dto: { approved_status: 'APPROVED' | 'REJECTED'; supervisor_comment?: string; rating?: number },
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.supervisorService.approveProduction(userId, productionId, dto);
  }
}
