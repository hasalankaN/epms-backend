import { pgTable, uuid, varchar, boolean, timestamp, text, integer, date, jsonb, numeric } from 'drizzle-orm/pg-core';
import { InferSelectModel } from 'drizzle-orm';
import { pgEnum } from 'drizzle-orm/pg-core';
import crypto from 'crypto';

export const users = pgTable('users', {
  user_id: uuid('user_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  first_name: varchar('first_name', { length: 100 }).notNull(),
  last_name: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phone_number: varchar('phone_number', { length: 20 }),
  country_code: varchar('country_code', { length: 10 }),
  password_hash: varchar('password_hash', { length: 255 }),

  // Firebase integration
  firebase_uid: varchar('firebase_uid', { length: 128 }).unique(),

  // Email verification
  email_verified: boolean('email_verified'),
  otp_code: varchar('otp_code', { length: 255 }),
  otp_expires_at: timestamp('otp_expires_at'),

  // Device / client info (optional)
  device_token: varchar('device_token', { length: 255 }),
  device_id: varchar('device_id', { length: 255 }),
  device_type: varchar('device_type', { length: 50 }),
  app_version: varchar('app_version', { length: 50 }),
  time_zone: varchar('time_zone', { length: 100 }),

  // Role
  role: varchar('role', { length: 50 }).default('Employee'),

  // Account status
  status: varchar('status', { length: 20 }),

  // Timestamps
  created_at: timestamp('created_at'),
  updated_at: timestamp('updated_at'),
  last_login: timestamp('last_login'),
});

export const passwordResetOtps = pgTable('password_reset_otps', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: varchar('email', { length: 255 }).notNull(),
  otp_hash: varchar('otp_hash', { length: 255 }).notNull(),
  expires_at: timestamp('expires_at').notNull(),
  is_used: boolean('is_used').default(false),
  attempts: integer('attempts').default(0),
  created_at: timestamp('created_at').defaultNow(),
});

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: varchar('email', { length: 255 }).notNull(),
  token: varchar('token', { length: 255 }).notNull(),
  associated_otp_id: uuid('associated_otp_id'),
  expires_at: timestamp('expires_at').notNull(),
  is_used: boolean('is_used').default(false),
  created_ip: varchar('created_ip', { length: 45 }),
  user_agent: text('user_agent'),
  created_at: timestamp('created_at').defaultNow(),
});


// Departments Table (From Diagram)
export const departments = pgTable('departments', {
  departmentId: uuid('department_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  departmentCode: varchar('department_code', { length: 50 }).unique(),
  departmentName: varchar('department_name', { length: 100 }).notNull(),
  location: varchar('location', { length: 100 }),
  deptPhone: varchar('dept_phone', { length: 20 }),
  noOfEmployees: integer('no_of_employees').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// Positions Table (From Diagram)
export const positions = pgTable('positions', {
  position_id: uuid('position_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  position_code: varchar('position_code', { length: 50 }).unique(),
  position_name: varchar('position_name', { length: 100 }).notNull(),
  description: text('description'),
  effective_date: date('effective_date'),
  created_at: timestamp('created_at').defaultNow(),
});

// Employees Table (Core Master Entity)
export const employees = pgTable('employees', {
  employee_id: uuid('employee_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  employee_no: varchar('employee_no', { length: 50 }).unique(),
  user_id: uuid('user_id').references(() => users.user_id, { onDelete: 'set null' }),
  epf_no: varchar('epf_no', { length: 50 }).notNull().unique(),
  first_name: varchar('first_name', { length: 100 }).notNull(),
  last_name: varchar('last_name', { length: 100 }).notNull(),
  dob: date('dob').notNull(),
  join_date: date('join_date').notNull(),
  work_email: varchar('work_email', { length: 255 }).notNull().unique(),
  personal_email: varchar('personal_email', { length: 255 }),
  mobile_no: varchar('mobile_no', { length: 20 }),
  home_tp: varchar('home_tp', { length: 20 }),
  street: varchar('street', { length: 150 }),
  city: varchar('city', { length: 100 }),
  province: varchar('province', { length: 100 }),
  country: varchar('country', { length: 100 }),

  // Foreign Keys
  departmentId: uuid('department_id').references(() => departments.departmentId),
  position_id: uuid('position_id').references(() => positions.position_id),
  supervisor_id: uuid('supervisor_id').references(() => employees.employee_id),

  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// Emergency Contacts
export const empEmergencyContacts = pgTable('emp_emergency_contacts', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  employee_id: uuid('employee_id').notNull().references(() => employees.employee_id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 150 }).notNull(),
  relationship: varchar('relationship', { length: 50 }).notNull(),
  mobile: varchar('mobile', { length: 20 }).notNull(),
  home_tp: varchar('home_tp', { length: 20 }),
  work_tp: varchar('work_tp', { length: 20 }),
});

// Qualifications
export const empQualifications = pgTable('emp_qualifications', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  employee_id: uuid('employee_id').notNull().references(() => employees.employee_id, { onDelete: 'cascade' }),
  qualification_title: varchar('qualification_title', { length: 150 }).notNull(),
  institute: varchar('institute', { length: 150 }),
  completed_year: integer('completed_year'),
});

// Dependents
export const empDependents = pgTable('emp_dependents', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  employee_id: uuid('employee_id').notNull().references(() => employees.employee_id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 150 }).notNull(),
  relationship: varchar('relationship', { length: 50 }).notNull(),
  dob: date('dob'),
  mobile: varchar('mobile', { length: 20 }),
  home_tp: varchar('home_tp', { length: 20 }),
});

// Employee Account Requests (Created by HR, reviewed by Admin)
export const employeeAccountRequests = pgTable('employee_account_requests', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  requested_by: uuid('requested_by').references(() => users.user_id, { onDelete: 'set null' }),
  status: varchar('status', { length: 20 }).default('PENDING').notNull(), // 'PENDING' | 'APPROVED' | 'REJECTED'

  // Personal Identity
  employee_no: varchar('employee_no', { length: 50 }),
  first_name: varchar('first_name', { length: 100 }).notNull(),
  last_name: varchar('last_name', { length: 100 }).notNull(),
  dob: date('dob').notNull(),
  join_date: date('join_date').notNull(),

  // Work & Contact Details
  epf_no: varchar('epf_no', { length: 50 }).notNull(),
  work_email: varchar('work_email', { length: 255 }).notNull(),
  personal_email: varchar('personal_email', { length: 255 }),
  mobile_no: varchar('mobile_no', { length: 20 }),
  home_tp: varchar('home_tp', { length: 20 }),

  // Address
  street: varchar('street', { length: 150 }),
  city: varchar('city', { length: 100 }),
  province: varchar('province', { length: 100 }),
  country: varchar('country', { length: 100 }),

  // Foreign Keys / Organization Relations
  departmentId: uuid('department_id').references(() => departments.departmentId, { onDelete: 'set null' }),
  position_id: uuid('position_id').references(() => positions.position_id, { onDelete: 'set null' }),
  supervisor_id: uuid('supervisor_id').references(() => employees.employee_id, { onDelete: 'set null' }),
  role: varchar('role', { length: 50 }).default('employee'),

  // JSON arrays for relational collections
  emergency_contacts: jsonb('emergency_contacts'),
  qualifications: jsonb('qualifications'),
  dependents: jsonb('dependents'),

  // Decision & Audit
  rejection_reason: text('rejection_reason'),
  reviewed_by: uuid('reviewed_by').references(() => users.user_id, { onDelete: 'set null' }),
  reviewed_at: timestamp('reviewed_at'),

  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// In-App Notifications
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  recipient_id: uuid('recipient_id').references(() => users.user_id, { onDelete: 'cascade' }),
  recipient_role: varchar('recipient_role', { length: 50 }), // 'admin', 'hr', etc.
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'EMPLOYEE_ACCOUNT_REQUEST', 'REQUEST_APPROVED', 'REQUEST_REJECTED', etc.
  data: jsonb('data'),
  is_read: boolean('is_read').default(false).notNull(),
  created_at: timestamp('created_at').defaultNow(),
});

export type User = InferSelectModel<typeof users>;
export type Admin = User;
export type PasswordResetOtp = InferSelectModel<typeof passwordResetOtps>;
export type PasswordResetToken = InferSelectModel<typeof passwordResetTokens>;

export type Department = InferSelectModel<typeof departments>;
export type Position = InferSelectModel<typeof positions>;
export type Employee = InferSelectModel<typeof employees>;
export type EmpEmergencyContact = InferSelectModel<typeof empEmergencyContacts>;
export type EmpQualification = InferSelectModel<typeof empQualifications>;
export type EmpDependent = InferSelectModel<typeof empDependents>;
export type EmployeeAccountRequest = InferSelectModel<typeof employeeAccountRequests>;
export type Notification = InferSelectModel<typeof notifications>;

// Work Experiences
export const workExperiences = pgTable('work_experiences', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  employee_id: uuid('employee_id').notNull().references(() => employees.employee_id, { onDelete: 'cascade' }),
  company: varchar('company', { length: 150 }).notNull(),
  designation: varchar('designation', { length: 100 }),
  start_date: date('start_date'),
  end_date: date('end_date'),
});

// Roles (Admin managed)
export const roles = pgTable('roles', {
  role_id: uuid('role_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar('name', { length: 80 }).notNull().unique(),
  description: text('description'),
  permissions: jsonb('permissions').default([]).notNull(),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// Supervisors profile table
export const supervisors = pgTable('supervisors', {
  supervisor_id: uuid('supervisor_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  emp_id: uuid('emp_id').notNull().references(() => employees.employee_id, { onDelete: 'cascade' }),
  description: text('description'),
  hire_date: date('hire_date'),
});

// HR Staff profile table
export const hrStaff = pgTable('hr_staff', {
  hr_id: uuid('hr_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  emp_id: uuid('emp_id').notNull().references(() => employees.employee_id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 20 }).default('ACTIVE').notNull(),
  hire_date: date('hire_date'),
});

// Admins profile table
export const admins = pgTable('admins', {
  admin_id: uuid('admin_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  emp_id: uuid('emp_id').notNull().references(() => employees.employee_id, { onDelete: 'cascade' }),
  description: text('description'),
  hire_date: date('hire_date'),
});

// Position History
export const positionHistory = pgTable('position_history', {
  history_id: uuid('history_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  emp_id: uuid('emp_id').notNull().references(() => employees.employee_id, { onDelete: 'cascade' }),
  position_id: uuid('position_id').notNull().references(() => positions.position_id),
  dept_id: uuid('dept_id').references(() => departments.departmentId),
  start_date: date('start_date').notNull(),
  end_date: date('end_date'),
  reason: text('reason'),
  created_by: uuid('created_by').references(() => users.user_id),
});

// Attendance Table
export const attendance = pgTable('attendance', {
  attendance_id: uuid('attendance_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  emp_id: uuid('emp_id').notNull().references(() => employees.employee_id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  punch_in: varchar('punch_in', { length: 20 }),
  punch_out: varchar('punch_out', { length: 20 }),
  in_late: boolean('in_late').default(false).notNull(),
  early_departure: boolean('early_departure').default(false).notNull(),
  total_late_min: integer('total_late_min').default(0).notNull(),
  break_hours: numeric('break_hours', { precision: 4, scale: 2 }).default('0').notNull(),
  work_hours: numeric('work_hours', { precision: 5, scale: 2 }).default('0').notNull(),
  status: varchar('status', { length: 20 }).default('PRESENT').notNull(), // PRESENT, ABSENT, ON_LEAVE
});

// Attendance Adjustments
export const attendanceAdjustments = pgTable('attendance_adjustments', {
  adjustment_id: uuid('adjustment_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  attendance_id: uuid('attendance_id').notNull().references(() => attendance.attendance_id, { onDelete: 'cascade' }),
  emp_id: uuid('emp_id').notNull().references(() => employees.employee_id, { onDelete: 'cascade' }),
  new_punch_in: varchar('new_punch_in', { length: 20 }),
  new_punch_out: varchar('new_punch_out', { length: 20 }),
  reason: text('reason').notNull(),
  status: varchar('status', { length: 20 }).default('PENDING').notNull(), // PENDING, APPROVED, REJECTED
  decided_by: uuid('decided_by').references(() => users.user_id),
  decision_date: timestamp('decision_date'),
  decision_comment: text('decision_comment'),
  created_at: timestamp('created_at').defaultNow(),
});

// Leave Policies
export const leavePolicies = pgTable('leave_policies', {
  leave_type: varchar('leave_type', { length: 50 }).primaryKey(), // ANNUAL, CASUAL, MEDICAL, NO_PAY, SPECIAL
  days_per_year: numeric('days_per_year', { precision: 5, scale: 1 }).notNull(),
  carry_forward: boolean('carry_forward').default(false).notNull(),
  rules: text('rules'),
  updated_by: uuid('updated_by').references(() => users.user_id),
  updated_at: timestamp('updated_at').defaultNow(),
});

// Leave Balances
export const leaveBalances = pgTable('leave_balances', {
  balance_id: uuid('balance_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  emp_id: uuid('emp_id').notNull().references(() => employees.employee_id, { onDelete: 'cascade' }),
  leave_type: varchar('leave_type', { length: 50 }).notNull(),
  year: integer('year').notNull(),
  balance: numeric('balance', { precision: 5, scale: 1 }).default('0').notNull(),
  used: numeric('used', { precision: 5, scale: 1 }).default('0').notNull(),
  pending: numeric('pending', { precision: 5, scale: 1 }).default('0').notNull(),
});

// Leaves
export const leaves = pgTable('leaves', {
  leave_id: uuid('leave_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  emp_id: uuid('emp_id').notNull().references(() => employees.employee_id, { onDelete: 'cascade' }),
  leave_type: varchar('leave_type', { length: 50 }).notNull(),
  start_date: date('start_date').notNull(),
  end_date: date('end_date').notNull(),
  days: numeric('days', { precision: 5, scale: 1 }).notNull(),
  reason: text('reason'),
  status: varchar('status', { length: 20 }).default('PENDING').notNull(), // PENDING, APPROVED, REJECTED, CANCELLED, ESCALATED
  approved_by: uuid('approved_by').references(() => users.user_id),
  approval_date: timestamp('approval_date'),
  decision_comment: text('decision_comment'),
  created_at: timestamp('created_at').defaultNow(),
});

// Tasks
export const tasks = pgTable('tasks', {
  task_id: uuid('task_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  emp_id: uuid('emp_id').notNull().references(() => employees.employee_id, { onDelete: 'cascade' }),
  supervisor_id: uuid('supervisor_id').references(() => employees.employee_id),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  due_date: date('due_date'),
  status: varchar('status', { length: 20 }).default('TODO').notNull(), // TODO, IN_PROGRESS, DONE, OVERDUE
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// Production
export const production = pgTable('production', {
  production_id: uuid('production_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  emp_id: uuid('emp_id').notNull().references(() => employees.employee_id, { onDelete: 'cascade' }),
  supervisor_id: uuid('supervisor_id').references(() => employees.employee_id),
  date: date('date').notNull(),
  project_name: varchar('project_name', { length: 150 }),
  client: varchar('client', { length: 150 }),
  expected_count: integer('expected_count').default(0).notNull(),
  actual_count: integer('actual_count').default(0).notNull(),
  rating: numeric('rating', { precision: 3, scale: 1 }),
  supervisor_comment: text('supervisor_comment'),
  special_remarks: text('special_remarks'),
  approved_status: varchar('approved_status', { length: 20 }).default('PENDING').notNull(), // PENDING, APPROVED, REJECTED
});

// Trainings
export const trainings = pgTable('trainings', {
  training_id: uuid('training_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  hr_id: uuid('hr_id').references(() => users.user_id),
  name: varchar('name', { length: 200 }).notNull(),
  scheduled_date: date('scheduled_date').notNull(),
  scheduled_time: varchar('scheduled_time', { length: 20 }),
  mode: varchar('mode', { length: 20 }).default('PHYSICAL').notNull(), // ONLINE, PHYSICAL, HYBRID
  venue: varchar('venue', { length: 200 }),
  status: varchar('status', { length: 20 }).default('PLANNED').notNull(), // PLANNED, ONGOING, COMPLETED, CANCELLED
  budget: numeric('budget', { precision: 12, scale: 2 }).default('0').notNull(),
  budget_status: varchar('budget_status', { length: 20 }).default('PENDING').notNull(), // PENDING, APPROVED, REJECTED
  instructors: jsonb('instructors').default([]).notNull(),
  created_at: timestamp('created_at').defaultNow(),
});

// Training Materials
export const trainingMaterials = pgTable('training_materials', {
  material_id: uuid('material_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  training_id: uuid('training_id').notNull().references(() => trainings.training_id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 200 }).notNull(),
  file_path: varchar('file_path', { length: 300 }).notNull(),
  uploaded_at: timestamp('uploaded_at').defaultNow(),
});

// Training Participants
export const trainingParticipants = pgTable('training_participants', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  training_id: uuid('training_id').notNull().references(() => trainings.training_id, { onDelete: 'cascade' }),
  emp_id: uuid('emp_id').notNull().references(() => employees.employee_id, { onDelete: 'cascade' }),
  attended: boolean('attended').default(false),
  rating: integer('rating'),
  evaluation: text('evaluation'),
  evaluated_at: timestamp('evaluated_at'),
});

// Performance Reviews
export const performanceReviews = pgTable('performance_reviews', {
  review_id: uuid('review_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  emp_id: uuid('emp_id').notNull().references(() => employees.employee_id, { onDelete: 'cascade' }),
  reviewer_id: uuid('reviewer_id').references(() => users.user_id),
  quarter: varchar('quarter', { length: 20 }).notNull(),
  rating: numeric('rating', { precision: 3, scale: 1 }).notNull(),
  comments: text('comments'),
  feedback: text('feedback'),
  reward: text('reward'),
  date: date('date').defaultNow().notNull(),
});

// Self Evaluations
export const selfEvaluations = pgTable('self_evaluations', {
  evaluation_id: uuid('evaluation_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  emp_id: uuid('emp_id').notNull().references(() => employees.employee_id, { onDelete: 'cascade' }),
  period: varchar('period', { length: 20 }).notNull(),
  employee_review: text('employee_review'),
  self_rating: numeric('self_rating', { precision: 3, scale: 1 }),
  supervisor_review: text('supervisor_review'),
  supervisor_rating: numeric('supervisor_rating', { precision: 3, scale: 1 }),
  manager_review: text('manager_review'),
  manager_rating: numeric('manager_rating', { precision: 3, scale: 1 }),
  final_status: varchar('final_status', { length: 30 }).default('DRAFT').notNull(), // DRAFT, SUBMITTED, SUPERVISOR_REVIEWED, FINALIZED
  date: date('date').defaultNow().notNull(),
});

// Evaluation Meetings
export const evaluationMeetings = pgTable('evaluation_meetings', {
  meeting_id: uuid('meeting_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  emp_id: uuid('emp_id').notNull().references(() => employees.employee_id, { onDelete: 'cascade' }),
  supervisor_id: uuid('supervisor_id').notNull().references(() => employees.employee_id, { onDelete: 'cascade' }),
  scheduled_at: timestamp('scheduled_at').notNull(),
  location: varchar('location', { length: 150 }),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow(),
});

// Salaries
export const salaries = pgTable('salaries', {
  salary_id: uuid('salary_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  emp_id: uuid('emp_id').notNull().references(() => employees.employee_id, { onDelete: 'cascade' }),
  basic_salary: numeric('basic_salary', { precision: 12, scale: 2 }).notNull(),
  effective_date: date('effective_date').notNull(),
  reason: text('reason'),
  created_by: uuid('created_by').references(() => users.user_id),
  created_at: timestamp('created_at').defaultNow(),
});

// Allowances
export const allowances = pgTable('allowances', {
  allowance_id: uuid('allowance_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  salary_id: uuid('salary_id').notNull().references(() => salaries.salary_id, { onDelete: 'cascade' }),
  description: varchar('description', { length: 200 }).notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
});

// Deductions
export const deductions = pgTable('deductions', {
  deduction_id: uuid('deduction_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  salary_id: uuid('salary_id').notNull().references(() => salaries.salary_id, { onDelete: 'cascade' }),
  description: varchar('description', { length: 200 }).notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
});

// Bonuses
export const bonuses = pgTable('bonuses', {
  bonus_id: uuid('bonus_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  emp_id: uuid('emp_id').notNull().references(() => employees.employee_id, { onDelete: 'cascade' }),
  description: varchar('description', { length: 200 }).notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  month: date('month').notNull(),
  created_by: uuid('created_by').references(() => users.user_id),
});

// Salary Slips
export const salarySlips = pgTable('salary_slips', {
  slip_id: uuid('slip_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  emp_id: uuid('emp_id').notNull().references(() => employees.employee_id, { onDelete: 'cascade' }),
  salary_id: uuid('salary_id').notNull().references(() => salaries.salary_id),
  month: date('month').notNull(),
  basic_salary: numeric('basic_salary', { precision: 12, scale: 2 }).notNull(),
  total_allowances: numeric('total_allowances', { precision: 12, scale: 2 }).default('0').notNull(),
  overtime_amount: numeric('overtime_amount', { precision: 12, scale: 2 }).default('0').notNull(),
  bonus_amount: numeric('bonus_amount', { precision: 12, scale: 2 }).default('0').notNull(),
  total_deductions: numeric('total_deductions', { precision: 12, scale: 2 }).default('0').notNull(),
  net_salary: numeric('net_salary', { precision: 12, scale: 2 }).notNull(),
  file_path: varchar('file_path', { length: 300 }),
  generated_by: uuid('generated_by').references(() => users.user_id),
  generated_at: timestamp('generated_at').defaultNow(),
});

// Job Postings
export const jobPostings = pgTable('job_postings', {
  job_id: uuid('job_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  hr_id: uuid('hr_id').references(() => users.user_id),
  dept_id: uuid('dept_id').references(() => departments.departmentId),
  position_id: uuid('position_id').references(() => positions.position_id),
  title: varchar('title', { length: 200 }).notNull(),
  requirements: text('requirements'),
  description: text('description'),
  posted_date: date('posted_date').defaultNow().notNull(),
  closing_date: date('closing_date'),
  status: varchar('status', { length: 20 }).default('OPEN').notNull(), // OPEN, CLOSED
});

// Job Applications
export const jobApplications = pgTable('job_applications', {
  application_id: uuid('application_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  job_id: uuid('job_id').notNull().references(() => jobPostings.job_id, { onDelete: 'cascade' }),
  emp_id: uuid('emp_id').notNull().references(() => employees.employee_id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 20 }).default('APPLIED').notNull(), // APPLIED, SHORTLISTED, INTERVIEW, SELECTED, REJECTED, CANCELLED
  applied_date: date('applied_date').defaultNow().notNull(),
});

// External Candidates
export const candidates = pgTable('candidates', {
  candidate_id: uuid('candidate_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  full_name: varchar('full_name', { length: 150 }).notNull(),
  email: varchar('email', { length: 150 }).notNull().unique(),
  phone: varchar('phone', { length: 30 }),
  resume_url: varchar('resume_url', { length: 300 }),
  status: varchar('status', { length: 30 }).default('APPLIED').notNull(),
  created_at: timestamp('created_at').defaultNow(),
});

// Interviews
export const interviews = pgTable('interviews', {
  interview_id: uuid('interview_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  application_id: uuid('application_id').references(() => jobApplications.application_id, { onDelete: 'cascade' }),
  candidate_id: uuid('candidate_id').references(() => candidates.candidate_id, { onDelete: 'cascade' }),
  hr_id: uuid('hr_id').references(() => users.user_id),
  interview_by: varchar('interview_by', { length: 150 }),
  interview_date: timestamp('interview_date').notNull(),
  status: varchar('status', { length: 20 }).default('SCHEDULED').notNull(), // SCHEDULED, COMPLETED, CANCELLED, NO_SHOW
  notes: text('notes'),
});

// Generic Requests (profile update, account create/deactivate/role change, attendance adjustment, etc.)
export const requests = pgTable('requests', {
  request_id: uuid('request_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  request_type: varchar('request_type', { length: 50 }).notNull(), // PROFILE_UPDATE, ATTENDANCE_ADJUSTMENT, ACCOUNT_CREATE, ACCOUNT_DEACTIVATE, ROLE_CHANGE, OTHER
  requested_by: uuid('requested_by').notNull().references(() => users.user_id),
  target_emp_id: uuid('target_emp_id').references(() => employees.employee_id),
  request_data: jsonb('request_data').default({}).notNull(),
  reason: text('reason'),
  status: varchar('status', { length: 20 }).default('PENDING').notNull(), // PENDING, APPROVED, REJECTED, CANCELLED, ESCALATED
  requested_date: timestamp('requested_date').defaultNow().notNull(),
  decided_by: uuid('decided_by').references(() => users.user_id),
  decision_date: timestamp('decision_date'),
  decision_comment: text('decision_comment'),
});

// Reports
export const reports = pgTable('reports', {
  report_id: uuid('report_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  hr_id: uuid('hr_id').references(() => users.user_id),
  report_type: varchar('report_type', { length: 50 }).notNull(), // ATTENDANCE, PERFORMANCE, EMPLOYEE, TRAINING, LEAVE, PRODUCTION, SALARY, DEPARTMENT_PERFORMANCE
  generated_date: timestamp('generated_date').defaultNow().notNull(),
  period_start: date('period_start'),
  period_end: date('period_end'),
  file_path: varchar('file_path', { length: 300 }),
});

// Audit Logs
export const auditLogs = pgTable('audit_logs', {
  audit_id: uuid('audit_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  account_id: uuid('account_id').references(() => users.user_id),
  action: varchar('action', { length: 60 }).notNull(),
  entity: varchar('entity', { length: 60 }).notNull(),
  entity_id: varchar('entity_id', { length: 100 }),
  details: jsonb('details'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Admin Dashboard Config
export const adminDashboardConfigs = pgTable('admin_dashboard_configs', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  widgets: jsonb('widgets').default({}).notNull(),
  updated_at: timestamp('updated_at').defaultNow(),
});

export type WorkExperience = InferSelectModel<typeof workExperiences>;
export type Role = InferSelectModel<typeof roles>;
export type Supervisor = InferSelectModel<typeof supervisors>;
export type HrStaff = InferSelectModel<typeof hrStaff>;
export type AdminStaff = InferSelectModel<typeof admins>;
export type PositionHistory = InferSelectModel<typeof positionHistory>;
export type Attendance = InferSelectModel<typeof attendance>;
export type AttendanceAdjustment = InferSelectModel<typeof attendanceAdjustments>;
export type LeavePolicy = InferSelectModel<typeof leavePolicies>;
export type LeaveBalance = InferSelectModel<typeof leaveBalances>;
export type Leave = InferSelectModel<typeof leaves>;
export type Task = InferSelectModel<typeof tasks>;
export type Production = InferSelectModel<typeof production>;
export type Training = InferSelectModel<typeof trainings>;
export type TrainingMaterial = InferSelectModel<typeof trainingMaterials>;
export type TrainingParticipant = InferSelectModel<typeof trainingParticipants>;
export type PerformanceReview = InferSelectModel<typeof performanceReviews>;
export type SelfEvaluation = InferSelectModel<typeof selfEvaluations>;
export type EvaluationMeeting = InferSelectModel<typeof evaluationMeetings>;
export type Salary = InferSelectModel<typeof salaries>;
export type Allowance = InferSelectModel<typeof allowances>;
export type Deduction = InferSelectModel<typeof deductions>;
export type Bonus = InferSelectModel<typeof bonuses>;
export type SalarySlip = InferSelectModel<typeof salarySlips>;
export type JobPosting = InferSelectModel<typeof jobPostings>;
export type JobApplication = InferSelectModel<typeof jobApplications>;
export type Candidate = InferSelectModel<typeof candidates>;
export type Interview = InferSelectModel<typeof interviews>;
export type RequestEntity = InferSelectModel<typeof requests>;
export type Report = InferSelectModel<typeof reports>;
export type AuditLog = InferSelectModel<typeof auditLogs>;
export type AdminDashboardConfig = InferSelectModel<typeof adminDashboardConfigs>;


