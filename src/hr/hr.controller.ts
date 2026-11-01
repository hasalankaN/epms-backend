import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { HrService } from './hr.service';
import { CreateEmployeeRequestDto } from './dto/create-employee-request.dto';
import { EmployeeRequestQueryDto } from './dto/employee-request-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../common/enums/roles.enum';

@ApiTags('hr')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.HR, UserRole.ADMIN)
@Controller('hr')
export class HrController {
  constructor(private readonly hrService: HrService) {}

  // -------------------------------------------------------------
  // Existing Employee Account Requests
  // -------------------------------------------------------------
  @Post('employee-request')
  @ApiOperation({ summary: 'Submit a new employee account request to Admin for approval (HR)' })
  async createEmployeeRequest(@Body() dto: CreateEmployeeRequestDto, @Req() req: any) {
    const requestedBy = req.user?.sub || req.user?.userId;
    return this.hrService.createEmployeeRequest(dto, requestedBy);
  }

  @Get('employee-requests')
  @ApiOperation({ summary: 'List employee account requests submitted by HR with pagination and filters' })
  async listEmployeeRequests(@Query() query: EmployeeRequestQueryDto) {
    return this.hrService.listEmployeeRequests(query);
  }

  @Get('employee-requests/:id')
  @ApiOperation({ summary: 'Get employee account request details by ID' })
  @ApiParam({ name: 'id', description: 'Request UUID' })
  async getEmployeeRequestById(@Param('id') id: string) {
    return this.hrService.getEmployeeRequestById(id);
  }

  // -------------------------------------------------------------
  // Profile
  // -------------------------------------------------------------
  @Get('profile')
  @ApiOperation({ summary: 'View HR own profile' })
  async getProfile(@Req() req: any) {
    const userId = req.user?.sub || req.user?.userId;
    return this.hrService.getProfile(userId);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update HR own profile' })
  async updateProfile(@Req() req: any, @Body() body: any) {
    const userId = req.user?.sub || req.user?.userId;
    return this.hrService.updateProfile(userId, body);
  }

  // -------------------------------------------------------------
  // Employees Management
  // -------------------------------------------------------------
  @Get('employees')
  @ApiOperation({ summary: 'Get all employees' })
  async getEmployees(@Query() query: any) {
    return this.hrService.getEmployees(query);
  }

  @Get('employees/:id')
  @ApiOperation({ summary: 'Get employee by ID' })
  @ApiParam({ name: 'id', description: 'Employee ID' })
  async getEmployeeById(@Param('id') id: string) {
    return this.hrService.getEmployeeById(id);
  }

  @Post('employees')
  @ApiOperation({ summary: 'Create new employee directly' })
  async createEmployee(@Body() dto: any) {
    return this.hrService.createEmployee(dto);
  }

  @Patch('employees/:id')
  @ApiOperation({ summary: 'Update employee details' })
  @ApiParam({ name: 'id', description: 'Employee ID' })
  async updateEmployee(@Param('id') id: string, @Body() dto: any) {
    return this.hrService.updateEmployee(id, dto);
  }

  @Delete('employees/:id')
  @ApiOperation({ summary: 'Delete employee' })
  @ApiParam({ name: 'id', description: 'Employee ID' })
  async deleteEmployee(@Param('id') id: string) {
    return this.hrService.deleteEmployee(id);
  }

  @Patch('employees/:id/supervisor')
  @ApiOperation({ summary: 'Assign supervisor to employee' })
  @ApiParam({ name: 'id', description: 'Employee ID' })
  async updateEmployeeSupervisor(@Param('id') id: string, @Body() body: { supervisor_id: string }) {
    return this.hrService.updateEmployeeSupervisor(id, body.supervisor_id);
  }

  @Get('employees/:id/roles')
  @ApiOperation({ summary: 'Get employee roles' })
  @ApiParam({ name: 'id', description: 'Employee ID' })
  async getEmployeeRoles(@Param('id') id: string) {
    return this.hrService.getEmployeeRoles(id);
  }

  @Patch('employees/:id/roles')
  @ApiOperation({ summary: 'Update employee role' })
  @ApiParam({ name: 'id', description: 'Employee ID' })
  async updateEmployeeRoles(@Param('id') id: string, @Body() body: { role: string }) {
    return this.hrService.updateEmployeeRoles(id, body);
  }

  // -------------------------------------------------------------
  // Profile Update Requests
  // -------------------------------------------------------------
  @Get('requests/profile-updates')
  @ApiOperation({ summary: 'List all profile update requests' })
  async getProfileUpdateRequests() {
    return this.hrService.getProfileUpdateRequests();
  }

  @Patch('requests/profile-updates/:id')
  @ApiOperation({ summary: 'Approve / reject profile update request with comment' })
  @ApiParam({ name: 'id', description: 'Request ID' })
  async decideProfileUpdateRequest(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: { decision: 'APPROVED' | 'REJECTED'; comment?: string },
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.hrService.decideProfileUpdateRequest(id, userId, dto);
  }

  // -------------------------------------------------------------
  // Attendance
  // -------------------------------------------------------------
  @Get('attendance')
  @ApiOperation({ summary: 'Get attendance records' })
  @ApiQuery({ name: 'date', required: false, type: String })
  @ApiQuery({ name: 'empId', required: false, type: String })
  async getAttendance(@Query('date') date?: string, @Query('empId') empId?: string) {
    return this.hrService.getAttendance({ date, empId });
  }

  @Get('attendance/:empId/summary')
  @ApiOperation({ summary: 'Get attendance summary for employee' })
  @ApiParam({ name: 'empId', description: 'Employee ID' })
  async getAttendanceSummary(@Param('empId') empId: string) {
    return this.hrService.getAttendanceSummary(empId);
  }

  @Post('attendance/notify')
  @ApiOperation({ summary: 'Send attendance notification / warning to employee' })
  async notifyAttendance(@Body() dto: { empId: string; message: string; title?: string }) {
    return this.hrService.notifyAttendance(dto);
  }

  @Get('attendance/overtime')
  @ApiOperation({ summary: 'Get overtime records' })
  @ApiQuery({ name: 'minHours', required: false, type: Number })
  async getOvertime(@Query('minHours') minHours?: number) {
    return this.hrService.getOvertime({ minHours });
  }

  // -------------------------------------------------------------
  // Training
  // -------------------------------------------------------------
  @Post('trainings')
  @ApiOperation({ summary: 'Create new training' })
  async createTraining(@Req() req: any, @Body() dto: any) {
    const userId = req.user?.sub || req.user?.userId;
    return this.hrService.createTraining(userId, dto);
  }

  @Get('trainings')
  @ApiOperation({ summary: 'List trainings' })
  async getTrainings() {
    return this.hrService.getTrainings();
  }

  @Get('trainings/:id')
  @ApiOperation({ summary: 'Get training by ID' })
  @ApiParam({ name: 'id', description: 'Training ID' })
  async getTrainingById(@Param('id') id: string) {
    return this.hrService.getTrainingById(id);
  }

  @Patch('trainings/:id')
  @ApiOperation({ summary: 'Update training details' })
  @ApiParam({ name: 'id', description: 'Training ID' })
  async updateTraining(@Param('id') id: string, @Body() dto: any) {
    return this.hrService.updateTraining(id, dto);
  }

  @Get('trainings/:id/attendance')
  @ApiOperation({ summary: 'Get training attendance' })
  @ApiParam({ name: 'id', description: 'Training ID' })
  async getTrainingAttendance(@Param('id') id: string) {
    return this.hrService.getTrainingAttendance(id);
  }

  @Post('trainings/:id/evaluation')
  @ApiOperation({ summary: 'Submit training evaluation for participant' })
  @ApiParam({ name: 'id', description: 'Training ID' })
  async submitHrTrainingEvaluation(
    @Param('id') id: string,
    @Body() dto: { emp_id: string; rating: number; evaluation: string },
  ) {
    return this.hrService.submitHrTrainingEvaluation(id, dto);
  }

  @Get('trainings/:id/report')
  @ApiOperation({ summary: 'Get training report' })
  @ApiParam({ name: 'id', description: 'Training ID' })
  async getTrainingReport(@Param('id') id: string) {
    return this.hrService.getTrainingReport(id);
  }

  @Patch('trainings/:id/budget')
  @ApiOperation({ summary: 'Update training budget and approval status' })
  @ApiParam({ name: 'id', description: 'Training ID' })
  async updateTrainingBudget(
    @Param('id') id: string,
    @Body() dto: { budget: number; budget_status: string },
  ) {
    return this.hrService.updateTrainingBudget(id, dto);
  }

  @Post('trainings/:id/materials')
  @ApiOperation({ summary: 'Upload training material' })
  @ApiParam({ name: 'id', description: 'Training ID' })
  async createTrainingMaterial(@Param('id') id: string, @Body() dto: { title: string; file_path: string }) {
    return this.hrService.createTrainingMaterial(id, dto);
  }

  @Patch('trainings/:id/materials/:materialId')
  @ApiOperation({ summary: 'Update training material' })
  @ApiParam({ name: 'id', description: 'Training ID' })
  @ApiParam({ name: 'materialId', description: 'Material ID' })
  async updateTrainingMaterial(
    @Param('id') id: string,
    @Param('materialId') materialId: string,
    @Body() dto: any,
  ) {
    return this.hrService.updateTrainingMaterial(id, materialId, dto);
  }

  @Delete('trainings/:id/materials/:materialId')
  @ApiOperation({ summary: 'Delete training material' })
  @ApiParam({ name: 'id', description: 'Training ID' })
  @ApiParam({ name: 'materialId', description: 'Material ID' })
  async deleteTrainingMaterial(@Param('id') id: string, @Param('materialId') materialId: string) {
    return this.hrService.deleteTrainingMaterial(id, materialId);
  }

  // -------------------------------------------------------------
  // Leave
  // -------------------------------------------------------------
  @Get('leaves')
  @ApiOperation({ summary: 'List all leave requests' })
  @ApiQuery({ name: 'status', required: false, type: String })
  async getLeaves(@Query('status') status?: string) {
    return this.hrService.getLeaves({ status });
  }

  @Patch('leaves/:id/decision')
  @ApiOperation({ summary: 'HR approve or reject leave request' })
  @ApiParam({ name: 'id', description: 'Leave ID' })
  async decideLeave(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: { decision: 'APPROVED' | 'REJECTED'; comment?: string },
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.hrService.decideLeave(id, userId, dto);
  }

  @Get('leave-balances/:empId')
  @ApiOperation({ summary: 'Get leave balances of employee' })
  @ApiParam({ name: 'empId', description: 'Employee ID' })
  async getLeaveBalances(@Param('empId') empId: string) {
    return this.hrService.getLeaveBalances(empId);
  }

  @Post('leaves/special')
  @ApiOperation({ summary: 'Grant special leave to employee' })
  async createSpecialLeave(
    @Body() dto: { emp_id: string; days: number; reason: string; start_date: string; end_date: string },
  ) {
    return this.hrService.createSpecialLeave(dto);
  }

  @Patch('leave-balances/:empId')
  @ApiOperation({ summary: 'Update leave balance for employee' })
  @ApiParam({ name: 'empId', description: 'Employee ID' })
  async updateLeaveBalance(
    @Param('empId') empId: string,
    @Body() dto: { leave_type: string; year: number; balance: number },
  ) {
    return this.hrService.updateLeaveBalance(empId, dto);
  }

  @Get('leave-policies')
  @ApiOperation({ summary: 'Get all leave policies' })
  async getLeavePolicies() {
    return this.hrService.getLeavePolicies();
  }

  @Get('leave-policies/:leaveType')
  @ApiOperation({ summary: 'Get leave policy for leave type' })
  @ApiParam({ name: 'leaveType', description: 'Leave type (e.g. ANNUAL, CASUAL, MEDICAL)' })
  async getLeavePolicy(@Param('leaveType') leaveType: string) {
    return this.hrService.getLeavePolicy(leaveType);
  }

  @Patch('leave-policies/:leaveType')
  @ApiOperation({ summary: 'Update leave policy' })
  @ApiParam({ name: 'leaveType', description: 'Leave type' })
  async updateLeavePolicy(@Req() req: any, @Param('leaveType') leaveType: string, @Body() dto: any) {
    const userId = req.user?.sub || req.user?.userId;
    return this.hrService.updateLeavePolicy(leaveType, dto, userId);
  }

  // -------------------------------------------------------------
  // Production and Performance
  // -------------------------------------------------------------
  @Get('production')
  @ApiOperation({ summary: 'Get production logs' })
  async getProduction() {
    return this.hrService.getProduction();
  }

  @Get('production/report')
  @ApiOperation({ summary: 'Get production report summary' })
  async getProductionReport() {
    return this.hrService.getProductionReport();
  }

  @Get('performance-reviews')
  @ApiOperation({ summary: 'Get performance reviews' })
  async getPerformanceReviews() {
    return this.hrService.getPerformanceReviews();
  }

  @Post('performance-reviews')
  @ApiOperation({ summary: 'Create performance review' })
  async createPerformanceReview(@Req() req: any, @Body() dto: any) {
    const userId = req.user?.sub || req.user?.userId;
    return this.hrService.createPerformanceReview(userId, dto);
  }

  @Post('performance-reviews/:id/feedback')
  @ApiOperation({ summary: 'Add feedback or reward to performance review' })
  @ApiParam({ name: 'id', description: 'Review ID' })
  async addReviewFeedback(@Param('id') id: string, @Body() dto: { feedback: string; reward?: string }) {
    return this.hrService.addReviewFeedback(id, dto);
  }

  @Post('compensation')
  @ApiOperation({ summary: 'Record compensation or bonus' })
  async createCompensation(@Body() dto: { emp_id: string; amount: number; description: string; month: string }) {
    return this.hrService.createCompensation(dto);
  }

  @Get('departments/:id/performance')
  @ApiOperation({ summary: 'Get department performance metrics' })
  @ApiParam({ name: 'id', description: 'Department ID' })
  async getDepartmentPerformance(@Param('id') id: string) {
    return this.hrService.getDepartmentPerformance(id);
  }

  // -------------------------------------------------------------
  // Department and Position
  // -------------------------------------------------------------
  @Post('departments')
  @ApiOperation({ summary: 'Create department' })
  async createDepartment(@Body() dto: any) {
    return this.hrService.createDepartment(dto);
  }

  @Delete('departments/:id')
  @ApiOperation({ summary: 'Delete department (blocked if employees assigned)' })
  @ApiParam({ name: 'id', description: 'Department ID' })
  async deleteDepartment(@Param('id') id: string) {
    return this.hrService.deleteDepartment(id);
  }

  @Post('positions')
  @ApiOperation({ summary: 'Create position' })
  async createPosition(@Body() dto: any) {
    return this.hrService.createPosition(dto);
  }

  @Patch('positions/:id')
  @ApiOperation({ summary: 'Update position' })
  @ApiParam({ name: 'id', description: 'Position ID' })
  async updatePosition(@Param('id') id: string, @Body() dto: any) {
    return this.hrService.updatePosition(id, dto);
  }

  @Delete('positions/:id')
  @ApiOperation({ summary: 'Delete position (blocked if employees assigned)' })
  @ApiParam({ name: 'id', description: 'Position ID' })
  async deletePosition(@Param('id') id: string) {
    return this.hrService.deletePosition(id);
  }

  @Post('positions/:id/assign')
  @ApiOperation({ summary: 'Assign position to employee' })
  @ApiParam({ name: 'id', description: 'Position ID' })
  async assignPosition(
    @Req() req: any,
    @Param('id') positionId: string,
    @Body() dto: { emp_id: string; dept_id?: string; start_date?: string; reason?: string },
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.hrService.assignPosition(positionId, userId, dto);
  }

  @Post('positions/transfer')
  @ApiOperation({ summary: 'Transfer employee position' })
  async transferPosition(
    @Req() req: any,
    @Body() dto: { emp_id: string; new_position_id: string; new_dept_id?: string; start_date?: string; reason?: string },
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.hrService.transferPosition(userId, dto);
  }

  @Get('positions/:id/history')
  @ApiOperation({ summary: 'Get position history' })
  @ApiParam({ name: 'id', description: 'Position ID' })
  async getPositionHistory(@Param('id') positionId: string) {
    return this.hrService.getPositionHistory(positionId);
  }

  // -------------------------------------------------------------
  // Salary
  // -------------------------------------------------------------
  @Get('salaries/:empId')
  @ApiOperation({ summary: 'Get employee current salary details' })
  @ApiParam({ name: 'empId', description: 'Employee ID' })
  async getSalary(@Param('empId') empId: string) {
    return this.hrService.getSalary(empId);
  }

  @Patch('salaries/:empId')
  @ApiOperation({ summary: 'Update salary (append-only with effectiveDate)' })
  @ApiParam({ name: 'empId', description: 'Employee ID' })
  async updateSalary(
    @Req() req: any,
    @Param('empId') empId: string,
    @Body() dto: { basic_salary: number; effective_date: string; reason?: string },
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.hrService.updateSalary(empId, userId, dto);
  }

  @Post('salaries/:empId/deductions')
  @ApiOperation({ summary: 'Add deduction to employee salary' })
  @ApiParam({ name: 'empId', description: 'Employee ID' })
  async addDeduction(@Param('empId') empId: string, @Body() dto: { description: string; amount: number }) {
    return this.hrService.addDeduction(empId, dto);
  }

  @Delete('salaries/:empId/deductions/:id')
  @ApiOperation({ summary: 'Delete deduction' })
  @ApiParam({ name: 'empId', description: 'Employee ID' })
  @ApiParam({ name: 'id', description: 'Deduction ID' })
  async deleteDeduction(@Param('empId') empId: string, @Param('id') id: string) {
    return this.hrService.deleteDeduction(empId, id);
  }

  @Post('salaries/:empId/allowances')
  @ApiOperation({ summary: 'Add allowance to employee salary' })
  @ApiParam({ name: 'empId', description: 'Employee ID' })
  async addAllowance(@Param('empId') empId: string, @Body() dto: { description: string; amount: number }) {
    return this.hrService.addAllowance(empId, dto);
  }

  @Delete('salaries/:empId/allowances/:id')
  @ApiOperation({ summary: 'Delete allowance' })
  @ApiParam({ name: 'empId', description: 'Employee ID' })
  @ApiParam({ name: 'id', description: 'Allowance ID' })
  async deleteAllowance(@Param('empId') empId: string, @Param('id') id: string) {
    return this.hrService.deleteAllowance(empId, id);
  }

  @Post('bonuses')
  @ApiOperation({ summary: 'Add bonus to employee' })
  async createBonus(
    @Req() req: any,
    @Body() dto: { emp_id: string; description: string; amount: number; month: string },
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.hrService.createBonus(userId, dto);
  }

  @Get('salaries/:empId/history')
  @ApiOperation({ summary: 'Get employee salary history' })
  @ApiParam({ name: 'empId', description: 'Employee ID' })
  async getSalaryHistory(@Param('empId') empId: string) {
    return this.hrService.getSalaryHistory(empId);
  }

  @Post('salary-slips')
  @ApiOperation({ summary: 'Generate salary slip (calculates net salary)' })
  async createSalarySlip(
    @Req() req: any,
    @Body()
    dto: {
      emp_id: string;
      month: string;
      basic_salary?: number;
      overtime_amount?: number;
      bonus_amount?: number;
    },
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.hrService.createSalarySlip(userId, dto);
  }

  @Get('salary-slips/:id/download')
  @ApiOperation({ summary: 'Download salary slip by ID' })
  @ApiParam({ name: 'id', description: 'Slip ID' })
  async downloadSalarySlip(@Param('id') id: string) {
    return this.hrService.getSalarySlipDownload(id);
  }

  @Get('salary-reports')
  @ApiOperation({ summary: 'Get salary reports' })
  @ApiQuery({ name: 'month', required: false, type: String })
  async getSalaryReports(@Query('month') month?: string) {
    return this.hrService.getSalaryReports({ month });
  }

  // -------------------------------------------------------------
  // Recruitment
  // -------------------------------------------------------------
  @Post('vacancies')
  @ApiOperation({ summary: 'Create vacancy' })
  async createVacancy(@Req() req: any, @Body() dto: any) {
    const userId = req.user?.sub || req.user?.userId;
    return this.hrService.createVacancy(userId, dto);
  }

  @Patch('vacancies/:id')
  @ApiOperation({ summary: 'Update vacancy' })
  @ApiParam({ name: 'id', description: 'Vacancy ID' })
  async updateVacancy(@Param('id') id: string, @Body() dto: any) {
    return this.hrService.updateVacancy(id, dto);
  }

  @Delete('vacancies/:id')
  @ApiOperation({ summary: 'Delete vacancy' })
  @ApiParam({ name: 'id', description: 'Vacancy ID' })
  async deleteVacancy(@Param('id') id: string) {
    return this.hrService.deleteVacancy(id);
  }

  @Get('vacancies/:id/applications')
  @ApiOperation({ summary: 'Get applications for vacancy' })
  @ApiParam({ name: 'id', description: 'Vacancy ID' })
  async getVacancyApplications(@Param('id') id: string) {
    return this.hrService.getVacancyApplications(id);
  }

  @Post('candidates')
  @ApiOperation({ summary: 'Add external candidate' })
  async createCandidate(@Body() dto: { full_name: string; email: string; phone?: string; resume_url?: string }) {
    return this.hrService.createCandidate(dto);
  }

  @Delete('candidates/:id')
  @ApiOperation({ summary: 'Delete candidate' })
  @ApiParam({ name: 'id', description: 'Candidate ID' })
  async deleteCandidate(@Param('id') id: string) {
    return this.hrService.deleteCandidate(id);
  }

  @Post('interviews')
  @ApiOperation({ summary: 'Schedule interview (validates no conflicts)' })
  async createInterview(
    @Req() req: any,
    @Body()
    dto: {
      application_id?: string;
      candidate_id?: string;
      interview_by?: string;
      interview_date: string;
      notes?: string;
    },
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.hrService.createInterview(userId, dto);
  }

  @Patch('interviews/:id')
  @ApiOperation({ summary: 'Update interview' })
  @ApiParam({ name: 'id', description: 'Interview ID' })
  async updateInterview(@Param('id') id: string, @Body() dto: any) {
    return this.hrService.updateInterview(id, dto);
  }

  // -------------------------------------------------------------
  // Notifications
  // -------------------------------------------------------------
  @Post('notifications')
  @ApiOperation({ summary: 'Create HR notification' })
  async createNotification(@Body() dto: any) {
    return this.hrService.createNotification(dto);
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Get HR notifications' })
  async getNotifications() {
    return this.hrService.getNotifications();
  }

  @Patch('notifications/:id')
  @ApiOperation({ summary: 'Update notification' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  async updateNotification(@Param('id') id: string, @Body() dto: any) {
    return this.hrService.updateNotification(id, dto);
  }

  @Delete('notifications/:id')
  @ApiOperation({ summary: 'Delete notification' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  async deleteNotification(@Param('id') id: string) {
    return this.hrService.deleteNotification(id);
  }

  // -------------------------------------------------------------
  // Reports
  // -------------------------------------------------------------
  @Get('reports/attendance')
  @ApiOperation({ summary: 'Get attendance report' })
  async getAttendanceReport(@Req() req: any, @Query() query: any) {
    const userId = req.user?.sub || req.user?.userId;
    return this.hrService.generateReport(userId, 'ATTENDANCE', query);
  }

  @Get('reports/performance')
  @ApiOperation({ summary: 'Get performance report' })
  async getPerformanceReport(@Req() req: any, @Query() query: any) {
    const userId = req.user?.sub || req.user?.userId;
    return this.hrService.generateReport(userId, 'PERFORMANCE', query);
  }

  @Get('reports/employees')
  @ApiOperation({ summary: 'Get employees report' })
  async getEmployeesReport(@Req() req: any, @Query() query: any) {
    const userId = req.user?.sub || req.user?.userId;
    return this.hrService.generateReport(userId, 'EMPLOYEE', query);
  }

  @Get('reports/training')
  @ApiOperation({ summary: 'Get training report' })
  async getTrainingReports(@Req() req: any, @Query() query: any) {
    const userId = req.user?.sub || req.user?.userId;
    return this.hrService.generateReport(userId, 'TRAINING', query);
  }

  @Get('reports/leave')
  @ApiOperation({ summary: 'Get leave report' })
  async getLeaveReport(@Req() req: any, @Query() query: any) {
    const userId = req.user?.sub || req.user?.userId;
    return this.hrService.generateReport(userId, 'LEAVE', query);
  }

  @Get('reports/production')
  @ApiOperation({ summary: 'Get production report' })
  async getProductionReports(@Req() req: any, @Query() query: any) {
    const userId = req.user?.sub || req.user?.userId;
    return this.hrService.generateReport(userId, 'PRODUCTION', query);
  }

  @Get('reports/salary')
  @ApiOperation({ summary: 'Get salary report' })
  async getSalaryReportSummary(@Req() req: any, @Query() query: any) {
    const userId = req.user?.sub || req.user?.userId;
    return this.hrService.generateReport(userId, 'SALARY', query);
  }

  @Get('reports')
  @ApiOperation({ summary: 'Get generated reports history' })
  async getReportsHistory() {
    return this.hrService.getReportsHistory();
  }

  // -------------------------------------------------------------
  // Account Requests
  // -------------------------------------------------------------
  @Post('requests/account')
  @ApiOperation({ summary: 'Send account request (create, deactivate, role change) to Admin' })
  async createAccountRequest(
    @Req() req: any,
    @Body()
    dto: {
      request_type: 'ACCOUNT_CREATE' | 'ACCOUNT_DEACTIVATE' | 'ROLE_CHANGE';
      target_emp_id?: string;
      request_data: any;
      reason: string;
    },
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.hrService.createAccountRequest(userId, dto);
  }
}
