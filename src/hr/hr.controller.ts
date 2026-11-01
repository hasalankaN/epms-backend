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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { HrService } from './hr.service';
import { CreateEmployeeRequestDto } from './dto/create-employee-request.dto';
import { EmployeeRequestQueryDto } from './dto/employee-request-query.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { UpdateHrProfileDto } from './dto/update-hr-profile.dto';
import { AssignSupervisorDto } from './dto/assign-supervisor.dto';
import { UpdateEmployeeRoleDto } from './dto/update-employee-role.dto';
import { DecideRequestDto } from './dto/decide-request.dto';
import { CreateTrainingDto } from './dto/create-training.dto';
import { UpdateTrainingDto } from './dto/update-training.dto';
import { TrainingEvaluationDto } from './dto/training-evaluation.dto';
import { UpdateTrainingBudgetDto } from './dto/update-training-budget.dto';
import { CreateTrainingMaterialDto, UpdateTrainingMaterialDto } from './dto/training-material.dto';import { DecideLeaveDto } from './dto/decide-leave.dto';
import { GrantSpecialLeaveDto } from './dto/grant-special-leave.dto';
import { UpdateLeaveBalanceDto } from './dto/update-leave-balance.dto';
import { UpdateLeavePolicyDto } from './dto/update-leave-policy.dto';
import { CreatePerformanceReviewDto } from './dto/create-performance-review.dto';
import { AddReviewFeedbackDto } from './dto/add-review-feedback.dto';
import { CreateCompensationDto } from './dto/create-compensation.dto';
import { CreateVacancyDto } from './dto/create-vacancy.dto';
import { UpdateVacancyDto } from './dto/update-vacancy.dto';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { UpdateInterviewDto } from './dto/update-interview.dto';
import { AssignPositionDto } from './dto/assign-position.dto';
import { TransferPositionDto } from './dto/transfer-position.dto';
import { UpdateSalaryDto } from './dto/update-salary.dto';
import { AddDeductionDto } from './dto/add-deduction.dto';
import { AddAllowanceDto } from './dto/add-allowance.dto';
import { CreateBonusDto } from './dto/create-bonus.dto';
import { CreateSalarySlipDto } from './dto/create-salary-slip.dto';
import { NotifyAttendanceDto } from './dto/notify-attendance.dto';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { CreateAccountRequestDto } from './dto/account-request.dto';
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
  constructor(private readonly hrService: HrService) { }

  // -------------------------------------------------------------
  // Existing Employee Account Requests
  // -------------------------------------------------------------
  @Post('employee-request')
  @ApiOperation({ summary: 'Submit a new employee account request to Admin for approval (HR)' })
  @ApiBody({ type: CreateEmployeeRequestDto })
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
  @ApiBody({ type: UpdateHrProfileDto })
  async updateProfile(@Req() req: any, @Body() dto: UpdateHrProfileDto) {
    const userId = req.user?.sub || req.user?.userId;
    return this.hrService.updateProfile(userId, dto);
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
  @ApiBody({ type: CreateEmployeeDto })
  async createEmployee(@Body() dto: CreateEmployeeDto) {
    return this.hrService.createEmployee(dto);
  }

  @Patch('employees/:id')
  @ApiOperation({ summary: 'Update employee details' })
  @ApiParam({ name: 'id', description: 'Employee ID' })
  @ApiBody({ type: UpdateEmployeeDto })
  async updateEmployee(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
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
  @ApiBody({ type: AssignSupervisorDto })
  async updateEmployeeSupervisor(@Param('id') id: string, @Body() body: AssignSupervisorDto) {
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
  @ApiBody({ type: UpdateEmployeeRoleDto })
  async updateEmployeeRoles(@Param('id') id: string, @Body() body: UpdateEmployeeRoleDto) {
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
  @ApiBody({ type: DecideRequestDto })
  async decideProfileUpdateRequest(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: DecideRequestDto,
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
  @ApiBody({ type: NotifyAttendanceDto })
  async notifyAttendance(@Body() dto: NotifyAttendanceDto) {
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
  @ApiBody({ type: CreateTrainingDto })
  async createTraining(@Req() req: any, @Body() dto: CreateTrainingDto) {
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
  @ApiBody({ type: UpdateTrainingDto })
  async updateTraining(@Param('id') id: string, @Body() dto: UpdateTrainingDto) {
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
  @ApiBody({ type: TrainingEvaluationDto })
  async submitHrTrainingEvaluation(
    @Param('id') id: string,
    @Body() dto: TrainingEvaluationDto,
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
  @ApiBody({ type: UpdateTrainingBudgetDto })
  async updateTrainingBudget(
    @Param('id') id: string,
    @Body() dto: UpdateTrainingBudgetDto,
  ) {
    return this.hrService.updateTrainingBudget(id, dto);
  }

  @Post('trainings/:id/materials')
  @ApiOperation({ summary: 'Upload training material' })
  @ApiParam({ name: 'id', description: 'Training ID' })
  @ApiBody({ type: CreateTrainingMaterialDto })
  async createTrainingMaterial(@Param('id') id: string, @Body() dto: CreateTrainingMaterialDto) {
    return this.hrService.createTrainingMaterial(id, dto);
  }

  @Patch('trainings/:id/materials/:materialId')
  @ApiOperation({ summary: 'Update training material' })
  @ApiParam({ name: 'id', description: 'Training ID' })
  @ApiParam({ name: 'materialId', description: 'Material ID' })
  @ApiBody({ type: UpdateTrainingMaterialDto })
  async updateTrainingMaterial(
    @Param('id') id: string,
    @Param('materialId') materialId: string,
    @Body() dto: UpdateTrainingMaterialDto,
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
  @ApiBody({ type: DecideLeaveDto })
  async decideLeave(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: DecideLeaveDto,
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
  @ApiBody({ type: GrantSpecialLeaveDto })
  async createSpecialLeave(
    @Body() dto: GrantSpecialLeaveDto,
  ) {
    return this.hrService.createSpecialLeave(dto);
  }

  @Patch('leave-balances/:empId')
  @ApiOperation({ summary: 'Update leave balance for employee' })
  @ApiParam({ name: 'empId', description: 'Employee ID' })
  @ApiBody({ type: UpdateLeaveBalanceDto })
  async updateLeaveBalance(
    @Param('empId') empId: string,
    @Body() dto: UpdateLeaveBalanceDto,
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
  @ApiBody({ type: UpdateLeavePolicyDto })
  async updateLeavePolicy(@Req() req: any, @Param('leaveType') leaveType: string, @Body() dto: UpdateLeavePolicyDto) {
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
  @ApiBody({ type: CreatePerformanceReviewDto })
  async createPerformanceReview(@Req() req: any, @Body() dto: CreatePerformanceReviewDto) {
    const userId = req.user?.sub || req.user?.userId;
    return this.hrService.createPerformanceReview(userId, dto);
  }

  @Post('performance-reviews/:id/feedback')
  @ApiOperation({ summary: 'Add feedback or reward to performance review' })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiBody({ type: AddReviewFeedbackDto })
  async addReviewFeedback(@Param('id') id: string, @Body() dto: AddReviewFeedbackDto) {
    return this.hrService.addReviewFeedback(id, dto);
  }

  @Post('compensation')
  @ApiOperation({ summary: 'Record compensation or bonus' })
  @ApiBody({ type: CreateCompensationDto })
  async createCompensation(@Body() dto: CreateCompensationDto) {
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
  @ApiBody({
    schema: {
      type: 'object',
      required: ['department_code', 'department_name'],
      properties: {
        department_code: { type: 'string', example: 'ENG' },
        department_name: { type: 'string', example: 'Engineering' },
        location: { type: 'string', example: 'Building A, 3rd Floor' },
        dept_phone: { type: 'string', example: '+94112345678' },
      },
    },
  })
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
  @ApiBody({
    schema: {
      type: 'object',
      required: ['position_code', 'position_name'],
      properties: {
        position_code: { type: 'string', example: 'SE' },
        position_name: { type: 'string', example: 'Software Engineer' },
        description: { type: 'string', example: 'Responsible for software development' },
        effective_date: { type: 'string', example: '2026-01-01' },
      },
    },
  })
  async createPosition(@Body() dto: any) {
    return this.hrService.createPosition(dto);
  }

  @Patch('positions/:id')
  @ApiOperation({ summary: 'Update position' })
  @ApiParam({ name: 'id', description: 'Position ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        position_name: { type: 'string', example: 'Senior Software Engineer' },
        description: { type: 'string', example: 'Updated position description' },
        effective_date: { type: 'string', example: '2026-06-01' },
      },
    },
  })
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
  @ApiBody({ type: AssignPositionDto })
  async assignPosition(
    @Req() req: any,
    @Param('id') positionId: string,
    @Body() dto: AssignPositionDto,
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.hrService.assignPosition(positionId, userId, dto);
  }

  @Post('positions/transfer')
  @ApiOperation({ summary: 'Transfer employee position' })
  @ApiBody({ type: TransferPositionDto })
  async transferPosition(
    @Req() req: any,
    @Body() dto: TransferPositionDto,
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
  @ApiBody({ type: UpdateSalaryDto })
  async updateSalary(
    @Req() req: any,
    @Param('empId') empId: string,
    @Body() dto: UpdateSalaryDto,
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.hrService.updateSalary(empId, userId, dto);
  }

  @Post('salaries/:empId/deductions')
  @ApiOperation({ summary: 'Add deduction to employee salary' })
  @ApiParam({ name: 'empId', description: 'Employee ID' })
  @ApiBody({ type: AddDeductionDto })
  async addDeduction(@Param('empId') empId: string, @Body() dto: AddDeductionDto) {
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
  @ApiBody({ type: AddAllowanceDto })
  async addAllowance(@Param('empId') empId: string, @Body() dto: AddAllowanceDto) {
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
  @ApiBody({ type: CreateBonusDto })
  async createBonus(
    @Req() req: any,
    @Body() dto: CreateBonusDto,
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
  @ApiBody({ type: CreateSalarySlipDto })
  async createSalarySlip(
    @Req() req: any,
    @Body() dto: CreateSalarySlipDto,
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
  @ApiBody({ type: CreateVacancyDto })
  async createVacancy(@Req() req: any, @Body() dto: CreateVacancyDto) {
    const userId = req.user?.sub || req.user?.userId;
    return this.hrService.createVacancy(userId, dto);
  }

  @Patch('vacancies/:id')
  @ApiOperation({ summary: 'Update vacancy' })
  @ApiParam({ name: 'id', description: 'Vacancy ID' })
  @ApiBody({ type: UpdateVacancyDto })
  async updateVacancy(@Param('id') id: string, @Body() dto: UpdateVacancyDto) {
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
  @ApiBody({ type: CreateCandidateDto })
  async createCandidate(@Body() dto: CreateCandidateDto) {
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
  @ApiBody({ type: CreateInterviewDto })
  async createInterview(
    @Req() req: any,
    @Body() dto: CreateInterviewDto,
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.hrService.createInterview(userId, dto);
  }

  @Patch('interviews/:id')
  @ApiOperation({ summary: 'Update interview' })
  @ApiParam({ name: 'id', description: 'Interview ID' })
  @ApiBody({ type: UpdateInterviewDto })
  async updateInterview(@Param('id') id: string, @Body() dto: UpdateInterviewDto) {
    return this.hrService.updateInterview(id, dto);
  }

  // -------------------------------------------------------------
  // Notifications
  // -------------------------------------------------------------
  @Post('notifications')
  @ApiOperation({ summary: 'Create HR notification' })
  @ApiBody({ type: CreateNotificationDto })
  async createNotification(@Body() dto: CreateNotificationDto) {
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
  @ApiBody({ type: UpdateNotificationDto })
  async updateNotification(@Param('id') id: string, @Body() dto: UpdateNotificationDto) {
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
  @ApiBody({ type: CreateAccountRequestDto })
  async createAccountRequest(
    @Req() req: any,
    @Body() dto: CreateAccountRequestDto,
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.hrService.createAccountRequest(userId, dto);
  }
}
