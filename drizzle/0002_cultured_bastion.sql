ALTER TABLE "departments" ADD COLUMN "department_code" varchar(50);--> statement-breakpoint
ALTER TABLE "employee_account_requests" ADD COLUMN "employee_no" varchar(50);--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "employee_no" varchar(50);--> statement-breakpoint
ALTER TABLE "positions" ADD COLUMN "position_code" varchar(50);--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_department_code_unique" UNIQUE("department_code");--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_employee_no_unique" UNIQUE("employee_no");--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_position_code_unique" UNIQUE("position_code");