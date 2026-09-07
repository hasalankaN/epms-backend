CREATE TABLE "departments" (
	"department_id" uuid PRIMARY KEY NOT NULL,
	"department_name" varchar(100) NOT NULL,
	"location" varchar(100),
	"dept_phone" varchar(20),
	"no_of_employees" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "emp_dependents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"employee_id" uuid NOT NULL,
	"name" varchar(150) NOT NULL,
	"relationship" varchar(50) NOT NULL,
	"dob" date,
	"mobile" varchar(20),
	"home_tp" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "emp_emergency_contacts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"employee_id" uuid NOT NULL,
	"name" varchar(150) NOT NULL,
	"relationship" varchar(50) NOT NULL,
	"mobile" varchar(20) NOT NULL,
	"home_tp" varchar(20),
	"work_tp" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "emp_qualifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"employee_id" uuid NOT NULL,
	"qualification_title" varchar(150) NOT NULL,
	"institute" varchar(150),
	"completed_year" integer
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"employee_id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"epf_no" varchar(50) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"dob" date NOT NULL,
	"join_date" date NOT NULL,
	"work_email" varchar(255) NOT NULL,
	"personal_email" varchar(255),
	"mobile_no" varchar(20),
	"home_tp" varchar(20),
	"street" varchar(150),
	"city" varchar(100),
	"province" varchar(100),
	"country" varchar(100),
	"department_id" uuid,
	"position_id" uuid,
	"supervisor_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "employees_epf_no_unique" UNIQUE("epf_no"),
	CONSTRAINT "employees_work_email_unique" UNIQUE("work_email")
);
--> statement-breakpoint
CREATE TABLE "password_reset_otps" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"otp_hash" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_used" boolean,
	"attempts" integer,
	"created_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"associated_otp_id" uuid,
	"expires_at" timestamp NOT NULL,
	"is_used" boolean,
	"created_ip" varchar(45),
	"user_agent" text,
	"created_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "positions" (
	"position_id" uuid PRIMARY KEY NOT NULL,
	"position_name" varchar(100) NOT NULL,
	"description" text,
	"effective_date" date,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone_number" varchar(20),
	"country_code" varchar(10),
	"password_hash" varchar(255),
	"firebase_uid" varchar(128),
	"email_verified" boolean,
	"otp_code" varchar(255),
	"otp_expires_at" timestamp,
	"device_token" varchar(255),
	"device_id" varchar(255),
	"device_type" varchar(50),
	"app_version" varchar(50),
	"time_zone" varchar(100),
	"role" varchar(50) DEFAULT 'Employee',
	"status" varchar(20),
	"created_at" timestamp,
	"updated_at" timestamp,
	"last_login" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_firebase_uid_unique" UNIQUE("firebase_uid")
);
--> statement-breakpoint
ALTER TABLE "emp_dependents" ADD CONSTRAINT "emp_dependents_employee_id_employees_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("employee_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emp_emergency_contacts" ADD CONSTRAINT "emp_emergency_contacts_employee_id_employees_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("employee_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emp_qualifications" ADD CONSTRAINT "emp_qualifications_employee_id_employees_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("employee_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_departments_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("department_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_position_id_positions_position_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("position_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_supervisor_id_employees_employee_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."employees"("employee_id") ON DELETE no action ON UPDATE no action;