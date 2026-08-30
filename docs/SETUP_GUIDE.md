# Quick Setup Guide

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] Node.js 18+ installed
- [ ] PostgreSQL database ready (Neon, Supabase, or local)
- [ ] Firebase project created
- [ ] Brevo account with API key

## Step-by-Step Setup

### 1. Install Dependencies

```bash
yarn install
```

If you get peer dependency warnings, install missing NestJS core packages:

```bash
yarn add @nestjs/common @nestjs/core @nestjs/platform-express reflect-metadata rxjs
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

#### Database
```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

#### JWT Secrets (Generate strong random strings)
```bash
# Generate secrets using Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

```env
JWT_ACCESS_SECRET=<generated-secret-1>
JWT_REFRESH_SECRET=<generated-secret-2>
OTP_SECRET=<generated-secret-3>
```

#### Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. **Get Service Account**:
   - Settings → Service Accounts → Generate new private key
   - Download JSON file
   - Convert to single line:
   ```bash
   jq -c . serviceAccountKey.json
   ```
   - Copy output to `FIREBASE_SERVICE_ACCOUNT` in `.env`

4. **Get Web API Key**:
   - Settings → General → Web API Key
   - Copy to `FIREBASE_WEB_API_KEY` in `.env`

#### Brevo Email Setup

1. Sign up at [Brevo](https://www.brevo.com/)
2. Get API key from Settings → SMTP & API
3. Add to `.env`:
   ```env
   BREVO_API_KEY=xkeysib-your-key
   BREVO_SENDER_EMAIL=noreply@yourdomain.com
   BREVO_SENDER_NAME=Your App Name
   ```

### 3. Database Setup

Generate migration files:
```bash
yarn db:generate
```

Push schema to database:
```bash
yarn db:push
```

Open Drizzle Studio (optional - visual database browser):
```bash
yarn db:studio
```

### 4. Start Development Server

```bash
yarn dev
```

Server runs at: http://localhost:3000  
API Docs: http://localhost:3000/api

## Testing the API

### Using Swagger UI

1. Open http://localhost:3000/api
2. Try the "Register" endpoint
3. Check console for OTP code
4. Use "Validate Email" endpoint with OTP
5. Login and get JWT tokens

### Using cURL

```bash
# 1. Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "password": "Test@1234",
    "phoneNumber": "+1234567890",
    "countryCode": "+1"
  }'

# Check console output for OTP code

# 2. Validate Email
curl -X POST http://localhost:3000/auth/validate-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "otpCode": "1234"
  }'

# 3. Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@1234"
  }'

# Save the access_token from response

# 4. Test Protected Endpoint
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer <your_access_token>"
```

## Common Issues

### Database Connection Error

**Error**: `Connection terminated unexpectedly`

**Solution**: 
- Check `DATABASE_URL` is correct
- Ensure database allows connections from your IP
- For Neon/Supabase, enable connection pooling

### Firebase Initialization Error

**Error**: `Failed to initialize Firebase`

**Solution**:
- Verify `FIREBASE_SERVICE_ACCOUNT` is valid JSON
- Ensure no extra quotes or escape characters
- Check Firebase project permissions

### OTP Not Received

**Note**: In development, OTPs are logged to console, not sent via email.

**To enable email sending**:
1. Configure Brevo API key
2. Uncomment email sending code in `auth.service.ts`
3. Implement Brevo integration

### Port Already in Use

**Error**: `EADDRINUSE: address already in use :::3000`

**Solution**:
```bash
# Change port in .env
PORT=3001

# Or kill process using port 3000
lsof -ti:3000 | xargs kill -9
```

## Next Steps

1. **Integrate Email Service**:
   - Implement Brevo SDK in `auth.service.ts`
   - Replace console.log with actual email sending

2. **Add Role Guards**:
   - Create `SellerGuard` for seller-only routes
   - Create `BuyerGuard` for buyer-only routes

3. **Implement Additional Features**:
   - User profile management
   - File uploads (avatars)
   - Social media connections

4. **Production Deployment**:
   - Set up environment-specific configs
   - Configure CORS for production domain
   - Enable rate limiting
   - Set up monitoring and logging

## Resources

- [Complete Auth Guide](./AUTHENTICATION_GUIDE.md)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)

## Support

If you encounter issues:
1. Check the [Authentication Guide](./AUTHENTICATION_GUIDE.md)
2. Review error logs in console
3. Verify all environment variables are set
4. Check database schema is pushed
5. Open an issue on GitHub

---

Happy coding! 🚀
