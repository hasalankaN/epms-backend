CREATE TABLE "password_reset_otps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"otp_hash" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_used" boolean DEFAULT false,
	"attempts" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"associated_otp_id" uuid,
	"expires_at" timestamp NOT NULL,
	"is_used" boolean DEFAULT false,
	"created_ip" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
-- CREATE TABLE "users" (
-- 	"user_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
-- 	"first_name" varchar(100) NOT NULL,
-- 	"last_name" varchar(100) NOT NULL,
-- 	"email" varchar(255) NOT NULL,
-- 	"phone_number" varchar(20),
-- 	"country_code" varchar(10),
-- 	"password_hash" varchar(255),
-- 	"firebase_uid" varchar(128),
-- 	"email_verified" boolean DEFAULT false,
-- 	"otp_code" varchar(255),
-- 	"otp_expires_at" timestamp,
-- 	"device_token" varchar(255),
-- 	"device_id" varchar(255),
-- 	"device_type" varchar(50),
-- 	"app_version" varchar(50),
-- 	"time_zone" varchar(100),
-- 	"status" varchar(20) DEFAULT 'Active',
-- 	"created_at" timestamp DEFAULT now(),
-- 	"updated_at" timestamp DEFAULT now(),
-- 	"last_login" timestamp,
-- 	CONSTRAINT "users_email_unique" UNIQUE("email"),
-- 	CONSTRAINT "users_firebase_uid_unique" UNIQUE("firebase_uid")
-- );

CREATE TABLE "users" (
    "user_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "first_name" varchar(100) NOT NULL,
    "last_name" varchar(100) NOT NULL,
    "email" varchar(255) NOT NULL,
    "phone_number" varchar(20),
    "country_code" varchar(10),
    "password_hash" varchar(255),
    "firebase_uid" varchar(128),
    "email_verified" boolean DEFAULT false,
    "role" varchar(50) DEFAULT 'Employee',
	"otp_code" varchar(255),
	"otp_expires_at" timestamp,
    "device_token" varchar(255),
    "device_id" varchar(255),
    "device_type" varchar(50),
    "app_version" varchar(50),
    "time_zone" varchar(100),
    "status" varchar(20) DEFAULT 'Active',
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now(),
    "last_login" timestamp,
    CONSTRAINT "users_email_unique" UNIQUE("email"),
    CONSTRAINT "users_firebase_uid_unique" UNIQUE("firebase_uid")
);
