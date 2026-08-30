-- Migration: create admins table
-- Fields: admin_id (uuid), email, password (plain text as requested), first_name, last_name, last_login, created_at, updated_at
CREATE TABLE IF NOT EXISTS admins (
  admin_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  country_code VARCHAR(10),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  -- Fields to support password reset via OTP
  password_reset_otp VARCHAR(20),
  password_reset_otp_expires_at TIMESTAMP,
  password_reset_token VARCHAR(255),
  password_reset_token_expires_at TIMESTAMP,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Index on email for quick lookup
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins (email);
-- Index for quick lookup by reset token
CREATE INDEX IF NOT EXISTS idx_admins_reset_token ON admins (password_reset_token);
