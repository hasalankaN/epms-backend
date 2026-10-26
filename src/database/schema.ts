import { pgTable, uuid, varchar, boolean, timestamp, text, integer, date, jsonb } from 'drizzle-orm/pg-core';
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
  is_used: boolean('is_used'),
  attempts: integer('attempts'),
  created_at: timestamp('created_at'),
});

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: varchar('email', { length: 255 }).notNull(),
  token: varchar('token', { length: 255 }).notNull(),
  associated_otp_id: uuid('associated_otp_id'),
  expires_at: timestamp('expires_at').notNull(),
  is_used: boolean('is_used'),
  created_ip: varchar('created_ip', { length: 45 }),
  user_agent: text('user_agent'),
  created_at: timestamp('created_at'),
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

