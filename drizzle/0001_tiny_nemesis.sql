CREATE TABLE "employee_account_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"requested_by" uuid,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"dob" date NOT NULL,
	"join_date" date NOT NULL,
	"epf_no" varchar(50) NOT NULL,
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
	"role" varchar(50) DEFAULT 'employee',
	"emergency_contacts" jsonb,
	"qualifications" jsonb,
	"dependents" jsonb,
	"rejection_reason" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"recipient_id" uuid,
	"recipient_role" varchar(50),
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"type" varchar(50) NOT NULL,
	"data" jsonb,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "employee_account_requests" ADD CONSTRAINT "employee_account_requests_requested_by_users_user_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_account_requests" ADD CONSTRAINT "employee_account_requests_department_id_departments_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("department_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_account_requests" ADD CONSTRAINT "employee_account_requests_position_id_positions_position_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("position_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_account_requests" ADD CONSTRAINT "employee_account_requests_supervisor_id_employees_employee_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."employees"("employee_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_account_requests" ADD CONSTRAINT "employee_account_requests_reviewed_by_users_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_users_user_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;