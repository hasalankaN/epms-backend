import { pgTable, uuid, varchar, boolean, timestamp, text, integer } from 'drizzle-orm/pg-core';
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

export const admins = pgTable('admins', {
  admin_id: uuid('admin_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  phone_number: varchar('phone_number', { length: 20 }),
  country_code: varchar('country_code', { length: 10 }),
  first_name: varchar('first_name', { length: 100 }).notNull(),
  last_name: varchar('last_name', { length: 100 }).notNull(),
  last_login: timestamp('last_login'),
  // Password reset / OTP fields
  password_reset_otp: varchar('password_reset_otp', { length: 20 }),
  password_reset_otp_expires_at: timestamp('password_reset_otp_expires_at'),
  password_reset_token: varchar('password_reset_token', { length: 255 }),
  password_reset_token_expires_at: timestamp('password_reset_token_expires_at'),

  created_at: timestamp('created_at'),
  updated_at: timestamp('updated_at'),
});

export type Admin = InferSelectModel<typeof admins>;

export type User = InferSelectModel<typeof users>;
export type PasswordResetOtp = InferSelectModel<typeof passwordResetOtps>;
export type PasswordResetToken = InferSelectModel<typeof passwordResetTokens>;
