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
import { MeService } from './me.service';

@ApiTags('me')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('me')
export class MeController {
  constructor(private readonly meService: MeService) {}

  // -------------------------------------------------------------
  // Profile
  // -------------------------------------------------------------
  @Get('profile')
  @ApiOperation({ summary: 'Get employee own profile with personal details, work experience, qualifications, emergency contacts, dependents' })
  async getProfile(@Req() req: any) {
    const userId = req.user?.sub || req.user?.userId;
    return this.meService.getProfile(userId);
  }

  @Post('profile-update-requests')
  @ApiOperation({ summary: 'Send profile update request (creates Request, notifies HR)' })
  async createProfileUpdateRequest(
    @Req() req: any,
    @Body() body: { updateData: any; reason?: string },
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.meService.createProfileUpdateRequest(userId, body.updateData || body, body.reason);
  }

  @Get('profile-update-requests')
  @ApiOperation({ summary: 'Status of own profile update requests' })
  async getProfileUpdateRequests(@Req() req: any) {
    const userId = req.user?.sub || req.user?.userId;
    return this.meService.getProfileUpdateRequests(userId);
  }

  // -------------------------------------------------------------
  // Leaves
  // -------------------------------------------------------------
  @Post('leaves')
  @ApiOperation({ summary: 'Submit leave request (validate balance and dates, notify Supervisor)' })
  async submitLeave(
    @Req() req: any,
    @Body() dto: { leave_type: string; start_date: string; end_date: string; days: number; reason?: string },
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.meService.submitLeave(userId, dto);
  }

  @Get('leaves')
  @ApiOperation({ summary: 'Leave history and status' })
  async getLeaves(@Req() req: any) {
    const userId = req.user?.sub || req.user?.userId;
    return this.meService.getLeaves(userId);
  }

  @Get('leave-balances')
  @ApiOperation({ summary: 'Balances per leave type' })
  async getLeaveBalances(@Req() req: any) {
    const userId = req.user?.sub || req.user?.userId;
    return this.meService.getLeaveBalances(userId);
  }

  // -------------------------------------------------------------
  // Attendance
  // -------------------------------------------------------------
  @Post('attendance/clock-in')
  @ApiOperation({ summary: 'One open record per day; flag late if after configured start time' })
  async clockIn(@Req() req: any) {
    const userId = req.user?.sub || req.user?.userId;
    return this.meService.clockIn(userId);
  }

  @Post('attendance/clock-out')
  @ApiOperation({ summary: 'Calculate work hours, early departure' })
  async clockOut(@Req() req: any) {
    const userId = req.user?.sub || req.user?.userId;
    return this.meService.clockOut(userId);
  }

  @Get('attendance')
  @ApiOperation({ summary: 'History with filters (late, early departure, absent)' })
  @ApiQuery({ name: 'late', required: false, type: Boolean })
  @ApiQuery({ name: 'earlyDeparture', required: false, type: Boolean })
  @ApiQuery({ name: 'absent', required: false, type: Boolean })
  async getAttendance(
    @Req() req: any,
    @Query('late') late?: string,
    @Query('earlyDeparture') earlyDeparture?: string,
    @Query('absent') absent?: string,
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.meService.getAttendanceHistory(userId, {
      late: late === 'true',
      earlyDeparture: earlyDeparture === 'true',
      absent: absent === 'true',
    });
  }

  @Post('attendance/adjustments')
  @ApiOperation({ summary: 'Request attendance adjustment (correct time + reason)' })
  async requestAttendanceAdjustment(
    @Req() req: any,
    @Body() dto: { attendance_id: string; new_punch_in?: string; new_punch_out?: string; reason: string },
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.meService.requestAttendanceAdjustment(userId, dto);
  }

  // -------------------------------------------------------------
  // Tasks
  // -------------------------------------------------------------
  @Get('tasks')
  @ApiOperation({ summary: 'Assigned tasks' })
  async getTasks(@Req() req: any) {
    const userId = req.user?.sub || req.user?.userId;
    return this.meService.getTasks(userId);
  }

  @Patch('tasks/:id/status')
  @ApiOperation({ summary: 'Update task status' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  async updateTaskStatus(
    @Req() req: any,
    @Param('id') taskId: string,
    @Body() body: { status: string },
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.meService.updateTaskStatus(userId, taskId, body.status);
  }

  // -------------------------------------------------------------
  // Production
  // -------------------------------------------------------------
  @Get('production')
  @ApiOperation({ summary: 'Production and target history' })
  async getProduction(@Req() req: any) {
    const userId = req.user?.sub || req.user?.userId;
    return this.meService.getProduction(userId);
  }

  // -------------------------------------------------------------
  // Trainings
  // -------------------------------------------------------------
  @Get('trainings')
  @ApiOperation({ summary: 'Schedule (date, time, mode, status)' })
  async getTrainings(@Req() req: any) {
    const userId = req.user?.sub || req.user?.userId;
    return this.meService.getTrainings(userId);
  }

  @Get('trainings/:id/materials')
  @ApiOperation({ summary: 'List and download materials' })
  @ApiParam({ name: 'id', description: 'Training ID' })
  async getTrainingMaterials(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.sub || req.user?.userId;
    return this.meService.getTrainingMaterials(userId, id);
  }

  @Post('trainings/:id/evaluation')
  @ApiOperation({ summary: 'Submit training evaluation (only after completion, once)' })
  @ApiParam({ name: 'id', description: 'Training ID' })
  async submitTrainingEvaluation(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: { rating: number; evaluation: string },
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.meService.submitTrainingEvaluation(userId, id, dto);
  }

  // -------------------------------------------------------------
  // Salary
  // -------------------------------------------------------------
  @Get('salary')
  @ApiOperation({ summary: 'Basic salary, allowances, deductions, net' })
  async getSalary(@Req() req: any) {
    const userId = req.user?.sub || req.user?.userId;
    return this.meService.getSalary(userId);
  }

  @Get('salary-slips')
  @ApiOperation({ summary: 'Own salary slips' })
  async getSalarySlips(@Req() req: any) {
    const userId = req.user?.sub || req.user?.userId;
    return this.meService.getSalarySlips(userId);
  }

  @Get('salary-slips/:id/download')
  @ApiOperation({ summary: 'Download own salary slip' })
  @ApiParam({ name: 'id', description: 'Salary Slip ID' })
  async downloadSalarySlip(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.sub || req.user?.userId;
    return this.meService.getSalarySlipById(userId, id);
  }

  // -------------------------------------------------------------
  // Recruitment
  // -------------------------------------------------------------
  @Get('job-postings')
  @ApiOperation({ summary: 'Open internal vacancies' })
  async getJobPostings() {
    return this.meService.getJobPostings();
  }

  @Post('job-postings/:id/apply')
  @ApiOperation({ summary: 'Apply for job (no duplicates, before closing date)' })
  @ApiParam({ name: 'id', description: 'Job Posting ID' })
  async applyForJob(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.sub || req.user?.userId;
    return this.meService.applyForJob(userId, id);
  }

  @Get('applications')
  @ApiOperation({ summary: 'Own applications and status' })
  async getApplications(@Req() req: any) {
    const userId = req.user?.sub || req.user?.userId;
    return this.meService.getApplications(userId);
  }

  @Delete('applications/:id')
  @ApiOperation({ summary: 'Cancel application' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  async cancelApplication(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.sub || req.user?.userId;
    return this.meService.cancelApplication(userId, id);
  }

  // -------------------------------------------------------------
  // Notifications
  // -------------------------------------------------------------
  @Get('notifications')
  @ApiOperation({ summary: 'List notifications' })
  async getNotifications(@Req() req: any) {
    const userId = req.user?.sub || req.user?.userId;
    const role = req.user?.role;
    return this.meService.getNotifications(userId, role);
  }

  @Patch('notifications/read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllNotificationsRead(@Req() req: any) {
    const userId = req.user?.sub || req.user?.userId;
    const role = req.user?.role;
    return this.meService.markAllNotificationsRead(userId, role);
  }

  @Patch('notifications/:id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  async markNotificationRead(@Param('id') id: string) {
    return this.meService.markNotificationRead(id);
  }

  // -------------------------------------------------------------
  // Evaluations & Reviews
  // -------------------------------------------------------------
  @Get('self-evaluations/current')
  @ApiOperation({ summary: 'The open self evaluation form' })
  async getCurrentSelfEvaluation(@Req() req: any) {
    const userId = req.user?.sub || req.user?.userId;
    return this.meService.getCurrentSelfEvaluation(userId);
  }

  @Post('self-evaluations')
  @ApiOperation({ summary: 'Submit self evaluation (ratings + comments)' })
  async submitSelfEvaluation(
    @Req() req: any,
    @Body() dto: { period: string; employee_review: string; self_rating: number },
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.meService.submitSelfEvaluation(userId, dto);
  }

  @Get('performance-reviews')
  @ApiOperation({ summary: 'Reviews received' })
  async getPerformanceReviews(@Req() req: any) {
    const userId = req.user?.sub || req.user?.userId;
    return this.meService.getPerformanceReviews(userId);
  }
}
