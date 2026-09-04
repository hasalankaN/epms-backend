-- Migration: Add role column to users and migrate data from admins table if it exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'role'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "role" varchar(50) DEFAULT 'Employee';
    END IF;
END $$;

-- Migrate existing admins to users if admins table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'admins'
    ) THEN
        INSERT INTO "users" (
            "user_id",
            "email",
            "password_hash",
            "phone_number",
            "country_code",
            "first_name",
            "last_name",
            "role",
            "status",
            "email_verified",
            "last_login",
            "created_at",
            "updated_at"
        )
        SELECT 
            "admin_id",
            "email",
            "password",
            "phone_number",
            "country_code",
            "first_name",
            "last_name",
            'admin',
            'Active',
            true,
            "last_login",
            "created_at",
            "updated_at"
        FROM "admins"
        ON CONFLICT ("email") DO UPDATE 
        SET "role" = 'admin';

        DROP TABLE IF EXISTS "admins" CASCADE;
    END IF;
END $$;
