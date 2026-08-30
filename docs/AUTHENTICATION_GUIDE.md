# Complete Authentication System Guide

> **Comprehensive reference for implementing Firebase + JWT dual authentication in NestJS**

This guide documents the complete authentication system implemented in this project, combining Firebase Authentication with custom JWT tokens. Use this as a reference for implementing similar authentication in future projects.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Technology Stack](#technology-stack)
- [Authentication Flow](#authentication-flow)
- [Project Structure](#project-structure)
- [Environment Setup](#environment-setup)
- [Implementation Details](#implementation-details)
- [API Endpoints](#api-endpoints)
- [Guards and Decorators](#guards-and-decorators)
- [Frontend Integration](#frontend-integration)
- [Testing](#testing)
- [Security Best Practices](#security-best-practices)

---

## Architecture Overview

### Dual Authentication System

This project uses a **hybrid authentication approach**:

1. **Firebase Authentication** - For user identity verification
2. **Custom JWT Tokens** - For API authorization

```
┌─────────────────────────────────────────────────────────────────┐
│                     Authentication Flow                          │
└─────────────────────────────────────────────────────────────────┘

Client                 Firebase              Backend              Database
  │                       │                      │                    │
  │  1. Sign In/Register  │                      │                    │
  ├──────────────────────>│                      │                    │
  │                       │                      │                    │
  │  2. Firebase ID Token │                      │                    │
  │<──────────────────────┤                      │                    │
  │                       │                      │                    │
  │  3. POST /auth/firebase/auth (with token)    │                    │
  ├─────────────────────────────────────────────>│                    │
  │                       │                      │                    │
  │                       │  4. Verify Token     │                    │
  │                       │<─────────────────────┤                    │
  │                       │                      │                    │
  │                       │  5. Token Valid      │                    │
  │                       │─────────────────────>│                    │
  │                       │                      │                    │
  │                       │                      │  6. Create/Update  │
  │                       │                      │─────────────────────>
  │                       │                      │                    │
  │                       │                      │  7. User Data      │
  │                       │                      │<────────────────────
  │                       │                      │                    │
  │  8. Backend JWT Tokens (access + refresh)    │                    │
  │<─────────────────────────────────────────────┤                    │
  │                       │                      │                    │
  │  9. Use JWT for all API calls                │                    │
  ├─────────────────────────────────────────────>│                    │
  │     Authorization: Bearer <JWT_TOKEN>        │                    │
  │                       │                      │                    │
```

### Why This Architecture?

**Firebase Authentication provides:**
- Secure user registration and login
- Email/password authentication
- Social auth (Google, Facebook, etc.)
- Email verification
- Password reset flows
- Built-in security features

**Custom JWT Tokens provide:**
- Fine-grained API access control
- Custom user claims (is_seller, is_buyer)
- Flexible token expiration
- Backend-controlled authorization
- Better performance (no Firebase API calls on every request)

---

## Technology Stack

### Core Dependencies

```json
{
  "dependencies": {
    "@nestjs/common": "^10.x",
    "@nestjs/core": "^10.x",
    "@nestjs/jwt": "^10.x",
    "@nestjs/passport": "^10.x",
    "@nestjs/config": "^3.x",
    "passport": "^0.7.x",
    "passport-jwt": "^4.x",
    "firebase-admin": "^12.x",
    "bcrypt": "^5.x",
    "drizzle-orm": "^0.33.x",
    "pg": "^8.x",
    "sib-api-v3-sdk": "^8.x"
  }
}
```

### Database

- **PostgreSQL** (via Neon or any Postgres provider)
- **Drizzle ORM** for type-safe database queries

### External Services

- **Firebase Authentication** - User identity management
- **Brevo (SendinBlue)** - Email delivery

---

## Authentication Flow

### 1. Traditional Email/Password Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                  Traditional Registration Flow                       │
└──────────────────────────────────────────────────────────────────────┘

1. POST /auth/register
   {
     "firstName": "John",
     "lastName": "Doe",
     "email": "john@example.com",
     "password": "StrongP@ss123",
     "phoneNumber": "+94771234567",
     "countryCode": "+94"
   }
   
  → Backend creates user in DB
  → Generates 4-digit OTP
  → Sends OTP via email
  → Response: { userId, message: "Check your email" }

2. POST /auth/validate-email
   {
     "email": "john@example.com",
     "otpCode": "1234"
   }
   
   → Verifies OTP
   → Marks email as verified
   → Response: { message: "Email verified" }

3. POST /auth/login
   {
     "email": "john@example.com",
     "password": "StrongP@ss123",
     "rememberMe": false
   }
   
   → Validates credentials
   → Issues JWT tokens
   → Response: {
       access_token: "eyJhbGc...",  // 24h or 7d if rememberMe=true
       refresh_token: "eyJhbGc...", // 7d
       user: { userId, firstName, ... }
     }
```

### 2. Firebase Authentication Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                  Firebase Authentication Flow                         │
└──────────────────────────────────────────────────────────────────────┘

CLIENT SIDE (Firebase SDK):

1. Sign up with Firebase
   const userCredential = await createUserWithEmailAndPassword(
     auth, 
     "john@example.com", 
     "StrongP@ss123"
   );

2. Get Firebase ID token
   const response = await fetch('http://localhost:3000/auth/firebase/auth', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ firebaseToken })
   });

BACKEND SIDE:

POST /auth/firebase/auth
{
  "firebaseToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
}

→ Verifies Firebase token with Firebase Admin SDK
→ Extracts user data (uid, email, name, email_verified)
→ Creates or updates user in local database
→ Links user with firebase_uid
→ For email/password providers: sends OTP for verification
→ Issues custom JWT tokens

Response:
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "requiresEmailVerification": false, // true if OTP sent
  "user": {
    "userId": "uuid",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "firebaseUid": "firebase_uid_here",
    "emailVerified": true,
    "isSeller": false,
    "isBuyer": true,
    "status": "Active"
  }
}
```

### 3. Token Refresh Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                      Token Refresh Flow                              │
└──────────────────────────────────────────────────────────────────────┘

SCENARIO: Access token expired (after 24 hours)

1. API call fails with 401
   GET /listings
   Authorization: Bearer <expired_access_token>
   
   ← 401 Unauthorized

2. Refresh tokens
   POST /auth/refresh
   {
     "refresh_token": "eyJhbGc..."
   }
   
   → Verifies refresh token signature
   → Checks user still exists and is active
   → Issues new tokens
   
   Response:
   {
     "access_token": "new_eyJhbGc...",  // Fresh 24h token
     "refresh_token": "new_eyJhbGc..."  // Fresh 7d token
   }

3. Retry API call
   GET /listings
   Authorization: Bearer <new_access_token>
   
   ← 200 OK (success)
```

### 4. Password Reset Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                    Password Reset Flow                               │
└──────────────────────────────────────────────────────────────────────┘

1. Request OTP
   POST /auth/resend-otp
   {
     "email": "john@example.com"
   }
   
  → Generates 4-digit OTP
  → Stores hashed OTP in password_reset_otps table
  → Sends OTP via email
  → Response: { message: "OTP sent" }

2. Validate OTP and get reset token
   POST /auth/validate-otp-for-reset
   {
     "email": "john@example.com",
     "otpCode": "1234"
   }
   
   → Verifies OTP hash
   → Generates short-lived reset token (5 minutes)
   → Stores token in password_reset_tokens table
   → Response: {
       status: "SUCCESS",
       data: { resetToken: "a1b2c3d4..." }
     }

3. Reset password with token
   POST /auth/reset-password-with-token
   {
     "email": "john@example.com",
     "resetToken": "a1b2c3d4...",
     "newPassword": "NewStrongP@ss456"
   }
   
   → Validates reset token
   → Updates Firebase password using Admin SDK
   → Marks token and OTP as used
   → Response: {
       status: "SUCCESS",
       message: "Password updated"
     }
```

---

## Project Structure

```
src/
├── auth/
│   ├── dto/
│   │   ├── register.dto.ts                    # Email/password registration
│   │   ├── login.dto.ts                       # Email/password login
│   │   ├── validate-email.dto.ts              # OTP verification
│   │   ├── resend-otp.dto.ts                  # Resend OTP request
│   │   ├── firebase-auth.dto.ts               # Firebase authentication
│   │   ├── refresh-token.dto.ts               # Token refresh
│   │   ├── validate-otp-for-reset.dto.ts      # OTP validation for reset
│   │   ├── reset-password-with-token.dto.ts   # Password reset with token
│   │   ├── reset-password.dto.ts              # Authenticated password reset
│   │   ├── change-password.dto.ts             # Change password (logged in)
│   │   └── index.ts                           # DTO exports
│   ├── auth.controller.ts                     # Authentication endpoints
│   ├── auth.service.ts                        # Authentication business logic
│   ├── auth.module.ts                         # Auth module configuration
│   ├── jwt-auth.guard.ts                      # JWT authentication guard
│   └── get-user.decorator.ts                  # Extract user from JWT
│
├── firebase/
│   ├── firebase.service.ts                    # Firebase Admin SDK wrapper
│   ├── firebase.strategy.ts                   # Passport strategy (optional)
│   ├── firebase-auth.guard.ts                 # Firebase auth guard (optional)
│   └── firebase.module.ts                     # Firebase module
│
├── database/
│   ├── schema.ts                              # Drizzle schema definitions
│   ├── database.module.ts                     # Database module
│   └── database.providers.ts                  # Database connection
│
<!-- Mobile SMS module removed from docs: mobile/SMS OTP sending disabled; keep phone fields for profile only -->
│
└── main.ts                                     # App entry point
```

---

## Environment Setup

### Required Environment Variables

Create a `.env` file with the following:

```bash
# Server
PORT=3000
NODE_ENV=development

# Database (PostgreSQL via Neon or other)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# JWT Secrets
JWT_ACCESS_SECRET=your-super-secret-access-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_EXPIRES_IN=24h

# Firebase Configuration
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"...","private_key":"..."}'
FIREBASE_WEB_API_KEY=AIzaSy...your-web-api-key

# Email Provider (Brevo/SendinBlue)
BREVO_API_KEY=xkeysib-...your-api-key
BREVO_SENDER_EMAIL=noreply@yourdomain.com
BREVO_SENDER_NAME=YourApp

# Mobile/SMS OTP sending has been removed from this documentation. Keep phone/profile fields, but OTPs are sent by email only.

# OTP Security
OTP_SECRET=your-otp-hashing-secret-change-in-production

# Google Cloud Storage (optional)
GCP_BUCKET_NAME=your-bucket-name
GCP_PROJECT_ID=your-project-id
GCP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GCP_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
```

### Getting Firebase Service Account

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click gear icon → **Project Settings**
4. Go to **Service Accounts** tab
5. Click **Generate new private key**
6. Download the JSON file
7. Convert to single-line JSON:
   ```bash
   jq -c . serviceAccountKey.json
   ```
8. Copy the output to `FIREBASE_SERVICE_ACCOUNT` in `.env`

### Firebase Web API Key

1. Firebase Console → Project Settings
2. General tab → Web API Key
3. Copy to `FIREBASE_WEB_API_KEY` in `.env`

---

## Implementation Details

### 1. Database Schema

```typescript
// src/database/schema.ts

import { pgTable, uuid, varchar, boolean, timestamp, text, integer } from 'drizzle-orm/pg-core';
import { InferSelectModel } from 'drizzle-orm';

export const users = pgTable('users', {
  user_id: uuid('user_id').primaryKey().defaultRandom(),
  first_name: varchar('first_name', { length: 100 }).notNull(),
  last_name: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phone_number: varchar('phone_number', { length: 20 }),
  country_code: varchar('country_code', { length: 10 }),
  password_hash: varchar('password_hash', { length: 255 }),
  
  // Firebase integration
  firebase_uid: varchar('firebase_uid', { length: 128 }).unique(),
  
  // Email verification
  email_verified: boolean('email_verified').default(false),
  otp_code: varchar('otp_code', { length: 10 }),
  otp_expires_at: timestamp('otp_expires_at'),
  
  // User roles
  is_seller: boolean('is_seller').default(false),
  is_buyer: boolean('is_buyer').default(true),
  
  // Account status
  status: varchar('status', { length: 20 }).default('Active'),
  
  // Timestamps
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
  last_login: timestamp('last_login'),
});

export const passwordResetOtps = pgTable('password_reset_otps', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull(),
  otp_hash: varchar('otp_hash', { length: 255 }).notNull(),
  expires_at: timestamp('expires_at').notNull(),
  is_used: boolean('is_used').default(false),
  attempts: integer('attempts').default(0),
  created_at: timestamp('created_at').defaultNow(),
});

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull(),
  token: varchar('token', { length: 255 }).notNull(),
  associated_otp_id: uuid('associated_otp_id'),
  expires_at: timestamp('expires_at').notNull(),
  is_used: boolean('is_used').default(false),
  created_ip: varchar('created_ip', { length: 45 }),
  user_agent: text('user_agent'),
  created_at: timestamp('created_at').defaultNow(),
});

export type User = InferSelectModel<typeof users>;
```

### 2. Firebase Service

```typescript
// src/firebase/firebase.service.ts

import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private firebaseApp: admin.app.App;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const serviceAccount = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT');
    
    if (!serviceAccount) {
      console.warn('[FirebaseService] FIREBASE_SERVICE_ACCOUNT not configured');
      return;
    }

    try {
      const serviceAccountJson = JSON.parse(serviceAccount);

      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccountJson),
      });

      console.log('[FirebaseService] Firebase Admin SDK initialized');
    } catch (error) {
      console.error('[FirebaseService] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Verify Firebase ID token
   */
  async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    try {
      return await admin.auth().verifyIdToken(idToken);
    } catch (error) {
      throw new Error(`Failed to verify Firebase token: ${error.message}`);
    }
  }

  /**
   * Get user by Firebase UID
   */
  async getUserByUid(uid: string): Promise<admin.auth.UserRecord> {
    try {
      return await admin.auth().getUser(uid);
    } catch (error) {
      throw new Error(`Failed to get Firebase user: ${error.message}`);
    }
  }

  /**
   * Update Firebase user (e.g., change password)
   */
  async updateUser(
    uid: string,
    properties: admin.auth.UpdateRequest,
  ): Promise<admin.auth.UserRecord> {
    try {
      return await admin.auth().updateUser(uid, properties);
    } catch (error) {
      throw new Error(`Failed to update Firebase user: ${error.message}`);
    }
  }

  /**
   * Create Firebase user
   */
  async createUser(
    userProperties: admin.auth.CreateRequest,
  ): Promise<admin.auth.UserRecord> {
    try {
      return await admin.auth().createUser(userProperties);
    } catch (error) {
      throw new Error(`Failed to create Firebase user: ${error.message}`);
    }
  }
}
```

### 3. JWT Guard

```typescript
// src/auth/jwt-auth.guard.ts

import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    
    if (!authHeader) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    const [type, token] = authHeader.split(' ');
    
    if (!token || type !== 'Bearer') {
      throw new UnauthorizedException('Invalid Authorization header');
    }

    try {
      const secret = this.configService.get<string>('JWT_ACCESS_SECRET');
      const payload = this.jwtService.verify(token, { secret });
      
      // Attach payload to request for use in handlers
      req.user = payload;
      return true;
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
```

### 4. User Decorator

```typescript
// src/auth/get-user.decorator.ts

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user || {};
    
    // If data is provided, return specific field (e.g., 'sub' for userId)
    if (data) return user[data];
    
    // Otherwise return entire user object
    return user;
  },
);
```

### 5. Auth Module Configuration

```typescript
// src/auth/auth.module.ts

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { DatabaseModule } from '../database/database.module';
import { FirebaseModule } from '../firebase/firebase.module';
// SmsModule removed from docs: mobile/SMS OTP sending is disabled

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    JwtModule.register({
      global: true, // Makes JwtService available globally
    }),
    DatabaseModule,
    FirebaseModule,
    // SmsModule removed: mobile/SMS OTP sending is disabled in this documentation
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
```

---

## API Endpoints

### Authentication Endpoints

#### 1. Register (Traditional)

**Endpoint:** `POST /auth/register`

**Description:** Register a new user with email/password

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "StrongP@ss123",
  "phoneNumber": "+94771234567",
  "countryCode": "+94"
}
```

**Response (201):**
```json
{
  "message": "Registration successful. Please check your email for OTP verification.",
  "userId": "uuid",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phoneNumber": "+94771234567",
  "countryCode": "+94"
}
```

**Validation Rules:**
- Password: min 8 chars, uppercase, lowercase, number, special char
- Phone: Valid international format
- Email: Valid email format

---

#### 2. Validate Email

**Endpoint:** `POST /auth/validate-email`

**Description:** Verify email with OTP code

**Request Body:**
```json
{
  "email": "john@example.com",
  "otpCode": "1234"
}
```

**Response (200):**
```json
{
  "message": "Email successfully verified"
}
```

---

#### 3. Login (Traditional)

**Endpoint:** `POST /auth/login`

**Description:** Login with email and password

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "StrongP@ss123",
  "rememberMe": false
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": "uuid",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phoneNumber": "+94771234567",
    "countryCode": "+94",
    "isSeller": false,
    "isBuyer": true,
    "status": "Active"
  }
}
```

**Token Expiry:**
- `rememberMe: false` → access_token: 24h
- `rememberMe: true` → access_token: 7d
- refresh_token: always 7d

---

#### 4. Firebase Auth

**Endpoint:** `POST /auth/firebase/auth`

**Description:** Login or register using Firebase Authentication

**Request Body:**
```json
{
  "firebaseToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "requiresEmailVerification": false,
  "user": {
    "userId": "uuid",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phoneNumber": "",
    "countryCode": "",
    "isSeller": false,
    "isBuyer": true,
    "status": "Active",
    "firebaseUid": "firebase_uid_here",
    "emailVerified": true
  }
}
```

**Notes:**
- `requiresEmailVerification: true` if OTP sent (new email/password users)
- Automatically creates user if not exists
- Updates last_login timestamp

---

#### 5. Firebase Sync User

**Endpoint:** `POST /auth/firebase/sync-user`

**Description:** Update user profile with additional information

**Request Body:**
```json
{
  "firebaseToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6...",
  "phoneNumber": "+94771234567",
  "countryCode": "+94",
  "firstName": "John",
  "lastName": "Doe",
  "isSeller": true,
  "isBuyer": true
}
```

**Response (200):**
```json
{
  "message": "User profile updated successfully",
  "user": {
    "userId": "uuid",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phoneNumber": "+94771234567",
    "countryCode": "+94",
    "isSeller": true,
    "isBuyer": true,
    "status": "Active"
  }
}
```

---

#### 6. Refresh Token

**Endpoint:** `POST /auth/refresh`

**Description:** Get new access and refresh tokens

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "access_token": "new_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "new_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Security:**
- Verifies refresh token signature
- Checks user still exists and is active
- Issues brand new tokens (token rotation)

---

#### 7. Resend OTP (Password Reset)

**Endpoint:** `POST /auth/resend-otp`

**Description:** Request OTP for password reset

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response (200):**
```json
{
  "message": "OTP sent successfully"
}
```

**Security:**
- Rate limiting: Max 3 OTP requests per hour
- OTP stored as HMAC-SHA256 hash
- 10-minute expiry
- Sent via email only

---

#### 8. Validate OTP for Reset

**Endpoint:** `POST /auth/validate-otp-for-reset`

**Description:** Validate OTP and get reset token (does NOT consume OTP)

**Request Body:**
```json
{
  "email": "john@example.com",
  "otpCode": "1234"
}
```

**Response (200):**
```json
{
  "status": "SUCCESS",
  "message": "OTP valid",
  "data": {
    "resetToken": "a1b2c3d4e5f6789..."
  }
}
```

**Security:**
- Max 5 attempts per OTP
- Verifies OTP hash
- Issues short-lived reset token (5 minutes)

---

#### 9. Reset Password with Token

**Endpoint:** `POST /auth/reset-password-with-token`

**Description:** Reset password using reset token (consumes token and OTP)

**Request Body:**
```json
{
  "email": "john@example.com",
  "resetToken": "a1b2c3d4e5f6789...",
  "newPassword": "NewStrongP@ss456"
}
```

**Response (200):**
```json
{
  "status": "SUCCESS",
  "message": "Password updated successfully."
}
```

**Security:**
- Validates reset token
- Updates Firebase password
- Marks token and OTP as used (one-time use)
- Creates Firebase user if doesn't exist

---

#### 10. Change Password (Authenticated)

**Endpoint:** `POST /auth/change-password`

**Authentication:** Required (JWT Bearer token)

**Description:** Change password for logged-in user

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "current_password": "OldP@ss123",
  "new_password": "NewStrongP@ss456"
}
```

**Response (200):**
```json
{
  "status": "SUCCESS",
  "message": "Password changed successfully"
}
```

**Security:**
- Verifies current password with Firebase REST API
- Ensures new password is different
- Updates Firebase password via Admin SDK

---

#### 11. Logout

**Endpoint:** `POST /auth/logout`

**Authentication:** Required (JWT Bearer token)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

**Note:** Client must discard tokens. This project doesn't maintain server-side token blacklist.

---

### JWT Payload Structure

```typescript
interface JwtPayload {
  sub: string;           // User ID (UUID)
  email: string;         // User email
  is_seller: boolean;    // Seller role flag
  is_buyer: boolean;     // Buyer role flag
  iat: number;           // Issued at (timestamp)
  exp: number;           // Expiry (timestamp)
}
```

---

## Guards and Decorators

### Using JWT Guard

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('listings')
export class ListingsController {

  // Protected route
  @Get('my-listings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getMyListings(@GetUser('sub') userId: string) {
    // userId extracted from JWT payload
    return this.listingsService.findByUserId(userId);
  }

  // Get entire user object
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getProfile(@GetUser() user: any) {
    // user = { sub, email, is_seller, is_buyer }
    return user;
  }
}
```

### Custom Guard for Roles

```typescript
// src/common/guards/roles.guard.ts

import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class SellerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    return user?.is_seller === true;
  }
}

// Usage
@Post('create-listing')
@UseGuards(JwtAuthGuard, SellerGuard)
@ApiBearerAuth()
async createListing(@GetUser('sub') userId: string, @Body() dto: CreateListingDto) {
  // Only sellers can access this
}
```

---

## Frontend Integration

### React Example with Firebase

```typescript
// firebase.config.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
```

```typescript
// authService.ts
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { auth } from './firebase.config';

const API_URL = 'http://localhost:3000';

// Email/Password Sign Up with Firebase
export async function signUpWithFirebase(email: string, password: string) {
  try {
    // 1. Create user in Firebase
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // 2. Get Firebase ID token
    const firebaseToken = await userCredential.user.getIdToken();
    
    // 3. Send token to backend
    const response = await fetch(`${API_URL}/auth/firebase/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firebaseToken })
    });
    
    const data = await response.json();
    
    // 4. Store backend JWT tokens
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    
    return data;
  } catch (error) {
    console.error('Sign up error:', error);
    throw error;
  }
}

// Email/Password Login with Firebase
export async function loginWithFirebase(email: string, password: string) {
  try {
    // 1. Sign in with Firebase
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // 2. Get Firebase ID token
    const firebaseToken = await userCredential.user.getIdToken();
    
    // 3. Exchange for backend JWT tokens
    const response = await fetch(`${API_URL}/auth/firebase/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firebaseToken })
    });
    
    const data = await response.json();
    
    // 4. Store backend JWT tokens
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

// Google Sign In
export async function signInWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    
    const firebaseToken = await userCredential.user.getIdToken();
    
    const response = await fetch(`${API_URL}/auth/firebase/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firebaseToken })
    });
    
    const data = await response.json();
    
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    
    return data;
  } catch (error) {
    console.error('Google sign in error:', error);
    throw error;
  }
}
```

### API Client with Auto Token Refresh

```typescript
// apiClient.ts
import { auth } from './firebase.config';

const API_URL = 'http://localhost:3000';

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refresh_token');
  
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }
  
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken })
  });
  
  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }
  
  const data = await response.json();
  
  localStorage.setItem('access_token', data.access_token);
  localStorage.setItem('refresh_token', data.refresh_token);
  
  return data.access_token;
}

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  let accessToken = localStorage.getItem('access_token');
  
  // First attempt
  let response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  
  // If 401, try to refresh token and retry
  if (response.status === 401) {
    try {
      accessToken = await refreshAccessToken();
      
      // Retry with new token
      response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      // Refresh failed, redirect to login
      localStorage.clear();
      window.location.href = '/login';
      throw error;
    }
  }
  
  return response.json();
}

// Usage
export const getListings = () => apiRequest('/listings');
export const createListing = (data: any) => apiRequest('/listings', {
  method: 'POST',
  body: JSON.stringify(data)
});
```

### React Auth Context

```typescript
// AuthContext.tsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth } from './firebase.config';
import { onAuthStateChanged } from 'firebase/auth';

interface AuthContextType {
  user: any;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const firebaseToken = await firebaseUser.getIdToken();
        
        // Get backend JWT tokens
        const response = await fetch('http://localhost:3000/auth/firebase/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firebaseToken })
        });
        
        const data = await response.json();
        
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        
        setUser(data.user);
      } else {
        setUser(null);
        localStorage.clear();
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    // Handled by onAuthStateChanged
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await auth.signOut();
    localStorage.clear();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

---

## Testing

### Testing Authentication Endpoints

```bash
# 1. Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "password": "StrongP@ss123",
    "phoneNumber": "+94771234567",
    "countryCode": "+94"
  }'

# 2. Validate Email
curl -X POST http://localhost:3000/auth/validate-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "otpCode": "1234"
  }'

# 3. Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "StrongP@ss123"
  }'

# Save the access_token from response

# 4. Access Protected Route
curl -X GET http://localhost:3000/listings/my-listings \
  -H "Authorization: Bearer <access_token>"

# 5. Refresh Token
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "<refresh_token>"
  }'
```

### Postman Collection

Import this JSON into Postman:

```json
{
  "info": {
    "name": "Auth API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000"
    },
    {
      "key": "access_token",
      "value": ""
    }
  ],
  "item": [
    {
      "name": "Register",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/auth/register",
        "body": {
          "mode": "raw",
          "raw": "{\n  \"firstName\": \"John\",\n  \"lastName\": \"Doe\",\n  \"email\": \"john@example.com\",\n  \"password\": \"StrongP@ss123\",\n  \"phoneNumber\": \"+94771234567\",\n  \"countryCode\": \"+94\"\n}"
        }
      }
    },
    {
      "name": "Login",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/auth/login",
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"john@example.com\",\n  \"password\": \"StrongP@ss123\"\n}"
        }
      },
      "event": [
        {
          "listen": "test",
          "script": {
            "exec": [
              "const response = pm.response.json();",
              "pm.collectionVariables.set('access_token', response.access_token);"
            ]
          }
        }
      ]
    },
    {
      "name": "Get Protected Resource",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/listings/my-listings",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{access_token}}"
          }
        ]
      }
    }
  ]
}
```

---

## Security Best Practices

### 1. Password Security

- **Bcrypt hashing** for traditional email/password users
- **Firebase handles password security** for Firebase users
- Enforce strong password rules (8+ chars, uppercase, lowercase, number, special)

### 2. OTP Security

```typescript
// Hash OTP before storing
private hashOtp(otp: string): string {
  const secret = this.configService.get<string>('OTP_SECRET');
  return crypto.createHmac('sha256', secret).update(otp).digest('hex');
}

// Rate limiting: max 3 OTP requests per hour
const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
const recentOtps = await this.db
  .select()
  .from(passwordResetOtps)
  .where(and(
    eq(passwordResetOtps.email, email),
    gt(passwordResetOtps.created_at, oneHourAgo)
  ));

if (recentOtps.length >= 3) {
  throw new BadRequestException('Too many OTP requests');
}

// Brute-force protection: max 5 attempts per OTP
if (otpRecord.attempts >= 5) {
  throw new BadRequestException('Too many attempts');
}
```

### 3. JWT Token Security

- **Separate secrets** for access and refresh tokens
- **Short-lived access tokens** (24h)
- **Token rotation** on refresh (issue new refresh token)
- Store JWT secrets in environment variables, never commit

### 4. Firebase Token Security

- **Verify Firebase tokens** with Admin SDK on backend
- **Never trust client claims** - always verify server-side
- Firebase tokens used **only once** during initial auth
- All subsequent requests use backend JWT

### 5. Password Reset Security

- **Two-step reset process**: OTP validation → Reset token → Password change
- **Short TTL for reset tokens** (5 minutes)
- **One-time use tokens** (marked as used after consumption)
- Track IP and user agent for reset tokens
- Atomic operations (mark token + OTP as used together)

### 6. CORS Configuration

```typescript
// main.ts
app.enableCors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
});
```

### 7. Helmet for Security Headers

```typescript
// main.ts
import helmet from 'helmet';

app.use(helmet());
```

### 8. Rate Limiting

```typescript
// main.ts
import rateLimit from 'express-rate-limit';

app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
}));
```

---

## Troubleshooting

### Common Issues

#### 1. Firebase Token Verification Fails

**Error:** `Failed to verify Firebase token`

**Solution:**
- Check `FIREBASE_SERVICE_ACCOUNT` is valid JSON
- Ensure Firebase project matches
- Verify token isn't expired (Firebase tokens expire after 1 hour)

#### 2. JWT Token Invalid

**Error:** `Invalid or expired token`

**Solution:**
- Check `JWT_ACCESS_SECRET` matches between token generation and verification
- Ensure token hasn't expired
- Use `/auth/refresh` to get new token

#### 3. Database Connection Error

**Error:** `Connection terminated unexpectedly`

**Solution:**
- Verify `DATABASE_URL` is correct
- Check network connectivity
- Ensure database allows connections from your IP

#### 4. OTP Not Received

**Issue:** User doesn't receive OTP email

**Solution:**
- Check `BREVO_API_KEY` is valid
- Verify sender email in Brevo dashboard
- Check spam folder
- Look for OTP in console logs (development mode)

---

## Migration Guide

### Adding to Existing NestJS Project

1. **Install dependencies**
   ```bash
   yarn add @nestjs/jwt @nestjs/passport passport passport-jwt firebase-admin bcrypt
   yarn add -D @types/passport-jwt @types/bcrypt
   ```

2. **Copy modules**
   - Copy `src/auth/` directory
   - Copy `src/firebase/` directory
   - Copy relevant database schema

3. **Update environment variables**
  - Add Firebase, JWT and email configs

4. **Run migrations**
   ```bash
   yarn db:generate
   yarn db:push
   ```

5. **Import modules**
   ```typescript
   // app.module.ts
   @Module({
     imports: [
       AuthModule,
       FirebaseModule,
       // ...
     ],
   })
   export class AppModule {}
   ```

6. **Protect routes**
   ```typescript
   @UseGuards(JwtAuthGuard)
   @ApiBearerAuth()
   async protectedRoute(@GetUser('sub') userId: string) {
     // ...
   }
   ```

---

## Conclusion

This authentication system provides:

✅ **Dual authentication** - Firebase + custom JWT  
✅ **Multiple login methods** - Email/password, Google, social  
✅ **Email verification** - OTP-based  
✅ **Secure password reset** - Two-step with tokens  
✅ **Token refresh** - Seamless session management  
✅ **Role-based access** - Seller/buyer flags  
✅ **Production-ready security** - Hashing, rate limiting, token rotation

Use this guide as a reference for implementing similar authentication in future projects. All code is modular and can be adapted to different frameworks and use cases.

---

## Quick Start Checklist

- [ ] Install dependencies (`yarn add @nestjs/jwt firebase-admin bcrypt ...`)
- [ ] Set up Firebase project and get service account JSON
- [ ] Configure environment variables (`.env`)
- [ ] Create database schema (users, password_reset_otps, password_reset_tokens)
- [ ] Copy auth module and Firebase module
- [ ] Set up email provider (Brevo)
- [ ] Set up email provider (Brevo)
- [ ] Test registration flow
- [ ] Test Firebase auth flow
- [ ] Test password reset flow
- [ ] Test token refresh
- [ ] Implement frontend integration
- [ ] Deploy and configure production secrets

---

**Last Updated:** January 2026  
**Version:** 1.0.0  
**Author:** PanDB Backend Team
