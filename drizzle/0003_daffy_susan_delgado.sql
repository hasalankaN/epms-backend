CREATE TABLE "admin_dashboard_configs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"widgets" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "admins" (
	"admin_id" uuid PRIMARY KEY NOT NULL,
	"emp_id" uuid NOT NULL,
	"description" text,
	"hire_date" date
);
--> statement-breakpoint
CREATE TABLE "allowances" (
	"allowance_id" uuid PRIMARY KEY NOT NULL,
	"salary_id" uuid NOT NULL,
	"description" varchar(200) NOT NULL,
	"amount" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance" (
	"attendance_id" uuid PRIMARY KEY NOT NULL,
	"emp_id" uuid NOT NULL,
	"date" date NOT NULL,
	"punch_in" varchar(20),
	"punch_out" varchar(20),
	"in_late" boolean DEFAULT false NOT NULL,
	"early_departure" boolean DEFAULT false NOT NULL,
	"total_late_min" integer DEFAULT 0 NOT NULL,
	"break_hours" numeric(4, 2) DEFAULT '0' NOT NULL,
	"work_hours" numeric(5, 2) DEFAULT '0' NOT NULL,
	"status" varchar(20) DEFAULT 'PRESENT' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_adjustments" (
	"adjustment_id" uuid PRIMARY KEY NOT NULL,
	"attendance_id" uuid NOT NULL,
	"emp_id" uuid NOT NULL,
	"new_punch_in" varchar(20),
	"new_punch_out" varchar(20),
	"reason" text NOT NULL,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"decided_by" uuid,
	"decision_date" timestamp,
	"decision_comment" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"audit_id" uuid PRIMARY KEY NOT NULL,
	"account_id" uuid,
	"action" varchar(60) NOT NULL,
	"entity" varchar(60) NOT NULL,
	"entity_id" varchar(100),
	"details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bonuses" (
	"bonus_id" uuid PRIMARY KEY NOT NULL,
	"emp_id" uuid NOT NULL,
	"description" varchar(200) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"month" date NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "candidates" (
	"candidate_id" uuid PRIMARY KEY NOT NULL,
	"full_name" varchar(150) NOT NULL,
	"email" varchar(150) NOT NULL,
	"phone" varchar(30),
	"resume_url" varchar(300),
	"status" varchar(30) DEFAULT 'APPLIED' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "candidates_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "deductions" (
	"deduction_id" uuid PRIMARY KEY NOT NULL,
	"salary_id" uuid NOT NULL,
	"description" varchar(200) NOT NULL,
	"amount" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evaluation_meetings" (
	"meeting_id" uuid PRIMARY KEY NOT NULL,
	"emp_id" uuid NOT NULL,
	"supervisor_id" uuid NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"location" varchar(150),
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "hr_staff" (
	"hr_id" uuid PRIMARY KEY NOT NULL,
	"emp_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"hire_date" date
);
--> statement-breakpoint
CREATE TABLE "interviews" (
	"interview_id" uuid PRIMARY KEY NOT NULL,
	"application_id" uuid,
	"candidate_id" uuid,
	"hr_id" uuid,
	"interview_by" varchar(150),
	"interview_date" timestamp NOT NULL,
	"status" varchar(20) DEFAULT 'SCHEDULED' NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "job_applications" (
	"application_id" uuid PRIMARY KEY NOT NULL,
	"job_id" uuid NOT NULL,
	"emp_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'APPLIED' NOT NULL,
	"applied_date" date DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_postings" (
	"job_id" uuid PRIMARY KEY NOT NULL,
	"hr_id" uuid,
	"dept_id" uuid,
	"position_id" uuid,
	"title" varchar(200) NOT NULL,
	"requirements" text,
	"description" text,
	"posted_date" date DEFAULT now() NOT NULL,
	"closing_date" date,
	"status" varchar(20) DEFAULT 'OPEN' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave_balances" (
	"balance_id" uuid PRIMARY KEY NOT NULL,
	"emp_id" uuid NOT NULL,
	"leave_type" varchar(50) NOT NULL,
	"year" integer NOT NULL,
	"balance" numeric(5, 1) DEFAULT '0' NOT NULL,
	"used" numeric(5, 1) DEFAULT '0' NOT NULL,
	"pending" numeric(5, 1) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave_policies" (
	"leave_type" varchar(50) PRIMARY KEY NOT NULL,
	"days_per_year" numeric(5, 1) NOT NULL,
	"carry_forward" boolean DEFAULT false NOT NULL,
	"rules" text,
	"updated_by" uuid,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leaves" (
	"leave_id" uuid PRIMARY KEY NOT NULL,
	"emp_id" uuid NOT NULL,
	"leave_type" varchar(50) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"days" numeric(5, 1) NOT NULL,
	"reason" text,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"approved_by" uuid,
	"approval_date" timestamp,
	"decision_comment" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "performance_reviews" (
	"review_id" uuid PRIMARY KEY NOT NULL,
	"emp_id" uuid NOT NULL,
	"reviewer_id" uuid,
	"quarter" varchar(20) NOT NULL,
	"rating" numeric(3, 1) NOT NULL,
	"comments" text,
	"feedback" text,
	"reward" text,
	"date" date DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "position_history" (
	"history_id" uuid PRIMARY KEY NOT NULL,
	"emp_id" uuid NOT NULL,
	"position_id" uuid NOT NULL,
	"dept_id" uuid,
	"start_date" date NOT NULL,
	"end_date" date,
	"reason" text,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "production" (
	"production_id" uuid PRIMARY KEY NOT NULL,
	"emp_id" uuid NOT NULL,
	"supervisor_id" uuid,
	"date" date NOT NULL,
	"project_name" varchar(150),
	"client" varchar(150),
	"expected_count" integer DEFAULT 0 NOT NULL,
	"actual_count" integer DEFAULT 0 NOT NULL,
	"rating" numeric(3, 1),
	"supervisor_comment" text,
	"special_remarks" text,
	"approved_status" varchar(20) DEFAULT 'PENDING' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"report_id" uuid PRIMARY KEY NOT NULL,
	"hr_id" uuid,
	"report_type" varchar(50) NOT NULL,
	"generated_date" timestamp DEFAULT now() NOT NULL,
	"period_start" date,
	"period_end" date,
	"file_path" varchar(300)
);
--> statement-breakpoint
CREATE TABLE "requests" (
	"request_id" uuid PRIMARY KEY NOT NULL,
	"request_type" varchar(50) NOT NULL,
	"requested_by" uuid NOT NULL,
	"target_emp_id" uuid,
	"request_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"reason" text,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"requested_date" timestamp DEFAULT now() NOT NULL,
	"decided_by" uuid,
	"decision_date" timestamp,
	"decision_comment" text
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"role_id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(80) NOT NULL,
	"description" text,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "salaries" (
	"salary_id" uuid PRIMARY KEY NOT NULL,
	"emp_id" uuid NOT NULL,
	"basic_salary" numeric(12, 2) NOT NULL,
	"effective_date" date NOT NULL,
	"reason" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "salary_slips" (
	"slip_id" uuid PRIMARY KEY NOT NULL,
	"emp_id" uuid NOT NULL,
	"salary_id" uuid NOT NULL,
	"month" date NOT NULL,
	"basic_salary" numeric(12, 2) NOT NULL,
	"total_allowances" numeric(12, 2) DEFAULT '0' NOT NULL,
	"overtime_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"bonus_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_deductions" numeric(12, 2) DEFAULT '0' NOT NULL,
	"net_salary" numeric(12, 2) NOT NULL,
	"file_path" varchar(300),
	"generated_by" uuid,
	"generated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "self_evaluations" (
	"evaluation_id" uuid PRIMARY KEY NOT NULL,
	"emp_id" uuid NOT NULL,
	"period" varchar(20) NOT NULL,
	"employee_review" text,
	"self_rating" numeric(3, 1),
	"supervisor_review" text,
	"supervisor_rating" numeric(3, 1),
	"manager_review" text,
	"manager_rating" numeric(3, 1),
	"final_status" varchar(30) DEFAULT 'DRAFT' NOT NULL,
	"date" date DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supervisors" (
	"supervisor_id" uuid PRIMARY KEY NOT NULL,
	"emp_id" uuid NOT NULL,
	"description" text,
	"hire_date" date
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"task_id" uuid PRIMARY KEY NOT NULL,
	"emp_id" uuid NOT NULL,
	"supervisor_id" uuid,
	"title" varchar(200) NOT NULL,
	"description" text,
	"due_date" date,
	"status" varchar(20) DEFAULT 'TODO' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "training_materials" (
	"material_id" uuid PRIMARY KEY NOT NULL,
	"training_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"file_path" varchar(300) NOT NULL,
	"uploaded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "training_participants" (
	"id" uuid PRIMARY KEY NOT NULL,
	"training_id" uuid NOT NULL,
	"emp_id" uuid NOT NULL,
	"attended" boolean DEFAULT false,
	"rating" integer,
	"evaluation" text,
	"evaluated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "trainings" (
	"training_id" uuid PRIMARY KEY NOT NULL,
	"hr_id" uuid,
	"name" varchar(200) NOT NULL,
	"scheduled_date" date NOT NULL,
	"scheduled_time" varchar(20),
	"mode" varchar(20) DEFAULT 'PHYSICAL' NOT NULL,
	"venue" varchar(200),
	"status" varchar(20) DEFAULT 'PLANNED' NOT NULL,
	"budget" numeric(12, 2) DEFAULT '0' NOT NULL,
	"budget_status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"instructors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "work_experiences" (
	"id" uuid PRIMARY KEY NOT NULL,
	"employee_id" uuid NOT NULL,
	"company" varchar(150) NOT NULL,
	"designation" varchar(100),
	"start_date" date,
	"end_date" date
);
--> statement-breakpoint
ALTER TABLE "password_reset_otps" ALTER COLUMN "is_used" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "password_reset_otps" ALTER COLUMN "attempts" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "password_reset_otps" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ALTER COLUMN "is_used" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "admins" ADD CONSTRAINT "admins_emp_id_employees_employee_id_fk" FOREIGN KEY ("emp_id") REFERENCES "public"."employees"("employee_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allowances" ADD CONSTRAINT "allowances_salary_id_salaries_salary_id_fk" FOREIGN KEY ("salary_id") REFERENCES "public"."salaries"("salary_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_emp_id_employees_employee_id_fk" FOREIGN KEY ("emp_id") REFERENCES "public"."employees"("employee_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_adjustments" ADD CONSTRAINT "attendance_adjustments_attendance_id_attendance_attendance_id_fk" FOREIGN KEY ("attendance_id") REFERENCES "public"."attendance"("attendance_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_adjustments" ADD CONSTRAINT "attendance_adjustments_emp_id_employees_employee_id_fk" FOREIGN KEY ("emp_id") REFERENCES "public"."employees"("employee_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_adjustments" ADD CONSTRAINT "attendance_adjustments_decided_by_users_user_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_account_id_users_user_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bonuses" ADD CONSTRAINT "bonuses_emp_id_employees_employee_id_fk" FOREIGN KEY ("emp_id") REFERENCES "public"."employees"("employee_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bonuses" ADD CONSTRAINT "bonuses_created_by_users_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deductions" ADD CONSTRAINT "deductions_salary_id_salaries_salary_id_fk" FOREIGN KEY ("salary_id") REFERENCES "public"."salaries"("salary_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_meetings" ADD CONSTRAINT "evaluation_meetings_emp_id_employees_employee_id_fk" FOREIGN KEY ("emp_id") REFERENCES "public"."employees"("employee_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_meetings" ADD CONSTRAINT "evaluation_meetings_supervisor_id_employees_employee_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."employees"("employee_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_staff" ADD CONSTRAINT "hr_staff_emp_id_employees_employee_id_fk" FOREIGN KEY ("emp_id") REFERENCES "public"."employees"("employee_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_application_id_job_applications_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."job_applications"("application_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_candidate_id_candidates_candidate_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("candidate_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_hr_id_users_user_id_fk" FOREIGN KEY ("hr_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_job_id_job_postings_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job_postings"("job_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_emp_id_employees_employee_id_fk" FOREIGN KEY ("emp_id") REFERENCES "public"."employees"("employee_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_hr_id_users_user_id_fk" FOREIGN KEY ("hr_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_dept_id_departments_department_id_fk" FOREIGN KEY ("dept_id") REFERENCES "public"."departments"("department_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_position_id_positions_position_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("position_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_emp_id_employees_employee_id_fk" FOREIGN KEY ("emp_id") REFERENCES "public"."employees"("employee_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_policies" ADD CONSTRAINT "leave_policies_updated_by_users_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaves" ADD CONSTRAINT "leaves_emp_id_employees_employee_id_fk" FOREIGN KEY ("emp_id") REFERENCES "public"."employees"("employee_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaves" ADD CONSTRAINT "leaves_approved_by_users_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_emp_id_employees_employee_id_fk" FOREIGN KEY ("emp_id") REFERENCES "public"."employees"("employee_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_reviewer_id_users_user_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "position_history" ADD CONSTRAINT "position_history_emp_id_employees_employee_id_fk" FOREIGN KEY ("emp_id") REFERENCES "public"."employees"("employee_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "position_history" ADD CONSTRAINT "position_history_position_id_positions_position_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("position_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "position_history" ADD CONSTRAINT "position_history_dept_id_departments_department_id_fk" FOREIGN KEY ("dept_id") REFERENCES "public"."departments"("department_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "position_history" ADD CONSTRAINT "position_history_created_by_users_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production" ADD CONSTRAINT "production_emp_id_employees_employee_id_fk" FOREIGN KEY ("emp_id") REFERENCES "public"."employees"("employee_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production" ADD CONSTRAINT "production_supervisor_id_employees_employee_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."employees"("employee_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_hr_id_users_user_id_fk" FOREIGN KEY ("hr_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_requested_by_users_user_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_target_emp_id_employees_employee_id_fk" FOREIGN KEY ("target_emp_id") REFERENCES "public"."employees"("employee_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_decided_by_users_user_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salaries" ADD CONSTRAINT "salaries_emp_id_employees_employee_id_fk" FOREIGN KEY ("emp_id") REFERENCES "public"."employees"("employee_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salaries" ADD CONSTRAINT "salaries_created_by_users_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_slips" ADD CONSTRAINT "salary_slips_emp_id_employees_employee_id_fk" FOREIGN KEY ("emp_id") REFERENCES "public"."employees"("employee_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_slips" ADD CONSTRAINT "salary_slips_salary_id_salaries_salary_id_fk" FOREIGN KEY ("salary_id") REFERENCES "public"."salaries"("salary_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_slips" ADD CONSTRAINT "salary_slips_generated_by_users_user_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "self_evaluations" ADD CONSTRAINT "self_evaluations_emp_id_employees_employee_id_fk" FOREIGN KEY ("emp_id") REFERENCES "public"."employees"("employee_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervisors" ADD CONSTRAINT "supervisors_emp_id_employees_employee_id_fk" FOREIGN KEY ("emp_id") REFERENCES "public"."employees"("employee_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_emp_id_employees_employee_id_fk" FOREIGN KEY ("emp_id") REFERENCES "public"."employees"("employee_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_supervisor_id_employees_employee_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."employees"("employee_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_materials" ADD CONSTRAINT "training_materials_training_id_trainings_training_id_fk" FOREIGN KEY ("training_id") REFERENCES "public"."trainings"("training_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_participants" ADD CONSTRAINT "training_participants_training_id_trainings_training_id_fk" FOREIGN KEY ("training_id") REFERENCES "public"."trainings"("training_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_participants" ADD CONSTRAINT "training_participants_emp_id_employees_employee_id_fk" FOREIGN KEY ("emp_id") REFERENCES "public"."employees"("employee_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trainings" ADD CONSTRAINT "trainings_hr_id_users_user_id_fk" FOREIGN KEY ("hr_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_experiences" ADD CONSTRAINT "work_experiences_employee_id_employees_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("employee_id") ON DELETE cascade ON UPDATE no action;