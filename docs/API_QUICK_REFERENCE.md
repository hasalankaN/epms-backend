# Authentication API Quick Reference

## Base URL
```
http://localhost:3000
```

## 🔐 Public Endpoints (No Auth Required)

### 1. Register User
```http
POST /auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "StrongP@ss123",
  "phoneNumber": "+1234567890",
  "countryCode": "+1"
}
```

**Response**: `{ userId, message, email, ... }`

---

### 2. Validate Email
```http
POST /auth/validate-email
Content-Type: application/json

{
  "email": "john@example.com",
  "otpCode": "1234"
}
```

**Response**: `{ message: "Email successfully verified" }`

---

### 3. Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "StrongP@ss123",
  "rememberMe": false
}
```

**Response**: `{ access_token, refresh_token, user: {...} }`

---

### 4. Firebase Auth
```http
POST /auth/firebase/auth
Content-Type: application/json

{
  "firebaseToken": "eyJhbGciOiJSUzI1NiIs..."
}
```

**Response**: `{ access_token, refresh_token, requiresEmailVerification, user }`

---

### 5. Sync Firebase User
```http
POST /auth/firebase/sync-user
Content-Type: application/json

{
  "firebaseToken": "eyJhbGciOiJSUzI1NiIs...",
  "phoneNumber": "+1234567890",
  "countryCode": "+1",
  "firstName": "John",
  "lastName": "Doe",
  "isSeller": true,
  "isBuyer": true
}
```

**Response**: `{ message, user }`

---

### 6. Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response**: `{ access_token, refresh_token }`

---

### 7. Request Password Reset OTP
```http
POST /auth/resend-otp
Content-Type: application/json

{
  "email": "john@example.com"
}
```

**Response**: `{ message: "OTP sent successfully" }`

---

### 8. Validate OTP for Reset
```http
POST /auth/validate-otp-for-reset
Content-Type: application/json

{
  "email": "john@example.com",
  "otpCode": "1234"
}
```

**Response**: `{ status: "SUCCESS", data: { resetToken } }`

---

### 9. Reset Password with Token
```http
POST /auth/reset-password-with-token
Content-Type: application/json

{
  "email": "john@example.com",
  "resetToken": "a1b2c3d4e5f6...",
  "newPassword": "NewStrongP@ss456"
}
```

**Response**: `{ status: "SUCCESS", message: "Password updated successfully" }`

---

## 🔒 Protected Endpoints (Auth Required)

### 10. Change Password
```http
POST /auth/change-password
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "current_password": "OldP@ss123",
  "new_password": "NewStrongP@ss456"
}
```

**Response**: `{ status: "SUCCESS", message: "Password changed successfully" }`

---

### 11. Logout
```http
POST /auth/logout
Authorization: Bearer <access_token>
```

**Response**: `{ message: "Logged out successfully" }`

---

## 🎯 Using Protected Routes

Add the JWT token to the `Authorization` header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 📋 JWT Payload Structure

```json
{
  "sub": "user-uuid",
  "email": "john@example.com",
  "is_seller": false,
  "is_buyer": true,
  "iat": 1704672000,
  "exp": 1704758400
}
```

## 🚨 Error Responses

All errors follow this format:

```json
{
  "statusCode": 400,
  "message": "Error message here",
  "error": "Bad Request"
}
```

Common status codes:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/expired token)
- `404` - Not Found (user/resource not found)
- `500` - Internal Server Error

## 🔄 Complete Authentication Flow

### Traditional Registration Flow
```
1. POST /auth/register
   → Backend creates user, sends OTP
   
2. Check email for OTP (or console in dev)

3. POST /auth/validate-email
   → Marks email as verified

4. POST /auth/login
   → Returns access_token + refresh_token

5. Use access_token for all API calls
```

### Firebase Authentication Flow
```
1. Client signs in with Firebase SDK
   → Gets Firebase ID token

2. POST /auth/firebase/auth
   → Backend verifies token, creates/updates user
   → Returns access_token + refresh_token

3. Use access_token for all API calls
```

### Password Reset Flow
```
1. POST /auth/resend-otp
   → Sends OTP to email

2. POST /auth/validate-otp-for-reset
   → Validates OTP, returns resetToken

3. POST /auth/reset-password-with-token
   → Updates password using resetToken
```

### Token Refresh Flow
```
1. API call fails with 401

2. POST /auth/refresh
   → Send refresh_token
   → Get new access_token + refresh_token

3. Retry API call with new access_token
```

## 🛡️ Security Notes

- Access tokens expire after 24h (or 7d if rememberMe=true)
- Refresh tokens expire after 7 days
- Reset tokens expire after 5 minutes
- OTPs expire after 10 minutes
- Max 3 OTP requests per hour
- Max 5 OTP validation attempts
- Passwords must have: uppercase, lowercase, number, special char

## 📦 Example: Complete Registration Test

```bash
#!/bin/bash

# 1. Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "password": "Test@1234"
  }'

# Check console for OTP

# 2. Validate
curl -X POST http://localhost:3000/auth/validate-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "otpCode": "1234"
  }'

# 3. Login
RESPONSE=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@1234"
  }')

# Extract token
TOKEN=$(echo $RESPONSE | jq -r '.access_token')

# 4. Use token
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer $TOKEN"
```

## 🎨 Swagger Documentation

Interactive API docs available at:
```
http://localhost:3000/api
```

Features:
- Try all endpoints
- View request/response schemas
- Authenticate and test protected routes
- Generate client code

---

**Pro Tip**: Use the Swagger UI for the best testing experience! 🚀
