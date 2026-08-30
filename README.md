# Fitness Coaching Backend API

> A comprehensive NestJS backend with Firebase + JWT dual authentication

## 🚀 Features

- **Dual Authentication System**: Firebase Authentication + Custom JWT tokens
- **Email/Password Registration**: Traditional auth with OTP email verification
- **Social Authentication**: Google, Facebook login via Firebase
- **Secure Password Reset**: Two-step OTP + reset token flow
- **Token Refresh**: Seamless session management with token rotation
- **Role-Based Access**: Seller and Buyer role flags
- **Type-Safe Database**: PostgreSQL with Drizzle ORM
- **API Documentation**: Auto-generated Swagger docs

## 📚 Documentation

For complete authentication system documentation, see:
- **[AUTHENTICATION_GUIDE.md](./docs/AUTHENTICATION_GUIDE.md)** - Comprehensive auth implementation guide

## 🛠️ Tech Stack

- **Framework**: NestJS 10.x
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Firebase Admin SDK + JWT
- **Validation**: class-validator
- **Email**: Brevo (SendinBlue)
- **API Docs**: Swagger/OpenAPI

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL database (Neon, Supabase, or local)
- Firebase project
- Brevo API key (for emails)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
yarn install
```

### 2. Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_ACCESS_SECRET` - Secret for access tokens
- `JWT_REFRESH_SECRET` - Secret for refresh tokens
- `FIREBASE_SERVICE_ACCOUNT` - Firebase service account JSON
- `FIREBASE_WEB_API_KEY` - Firebase web API key
- `BREVO_API_KEY` - Brevo API key for emails
- `OTP_SECRET` - Secret for OTP hashing

### 3. Database Setup

Generate and push database schema:

```bash
yarn db:generate
yarn db:push
```

### 4. Run Development Server

```bash
yarn dev
```

Server will start at `http://localhost:3000`

## 📖 API Documentation

Once the server is running, access the interactive API docs:

**Swagger UI**: http://localhost:3000/api

## 🔐 Authentication Endpoints

### Registration & Login

```bash
POST /auth/register                    # Register with email/password
POST /auth/validate-email              # Verify email with OTP
POST /auth/login                       # Login with credentials
```

### Firebase Authentication

```bash
POST /auth/firebase/auth               # Authenticate with Firebase token
POST /auth/firebase/sync-user          # Sync user profile
```

### Token Management

```bash
POST /auth/refresh                     # Refresh access token
POST /auth/logout                      # Logout (client-side)
```

### Password Reset

```bash
POST /auth/resend-otp                  # Request reset OTP
POST /auth/validate-otp-for-reset      # Validate OTP, get reset token
POST /auth/reset-password-with-token   # Reset password with token
POST /auth/change-password             # Change password (authenticated)
```

## 🗄️ Database Schema

### Users Table
- `user_id` (UUID, primary key)
- `first_name`, `last_name`, `email`
- `phone_number`, `country_code`
- `password_hash` (bcrypt)
- `firebase_uid` (Firebase integration)
- `email_verified`, `otp_code`, `otp_expires_at`
- `is_seller`, `is_buyer` (role flags)
- `status`, `created_at`, `updated_at`, `last_login`

### Password Reset Tables
- `password_reset_otps` - OTP records with expiry
- `password_reset_tokens` - Short-lived reset tokens

## 🧪 Testing with cURL

```bash
# 1. Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"John","lastName":"Doe","email":"john@example.com","password":"StrongP@ss123"}'

# 2. Validate Email
curl -X POST http://localhost:3000/auth/validate-email \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","otpCode":"1234"}'

# 3. Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"StrongP@ss123"}'

# 4. Access Protected Route
curl -X GET http://localhost:3000/some-protected-route \
  -H "Authorization: Bearer <access_token>"
```

## 🔒 Security Features

- **Password Hashing**: bcrypt with salt rounds
- **OTP Security**: HMAC-SHA256 hashing
- **Rate Limiting**: Max 3 OTP requests per hour
- **Token Rotation**: New refresh token on each refresh
- **Brute Force Protection**: Max 5 OTP attempts
- **Short-lived Reset Tokens**: 5-minute expiry
- **CORS**: Configured for frontend origin

## 🏗️ Project Structure

```
src/
├── auth/                  # Authentication module
│   ├── dto/              # Data transfer objects
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.module.ts
│   ├── jwt-auth.guard.ts
│   └── get-user.decorator.ts
├── database/              # Database configuration
│   ├── schema.ts
│   └── database.module.ts
├── firebase/              # Firebase integration
│   ├── firebase.service.ts
│   └── firebase.module.ts
└── main.ts               # Application entry point
```

## 📦 Scripts

```bash
yarn dev              # Start development server
yarn build            # Build for production
yarn start            # Start production server
yarn db:generate      # Generate database migrations
yarn db:push          # Push schema to database
yarn db:studio        # Open Drizzle Studio
```

## 🌐 Environment Variables

See `.env.example` for all required variables.

### Getting Firebase Service Account

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Project Settings → Service Accounts
3. Generate new private key
4. Convert to single-line JSON:
   ```bash
   jq -c . serviceAccountKey.json
   ```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 👥 Authors

**PanDB Backend Team**

## 📞 Support

For issues and questions:
- Check the [Authentication Guide](./docs/AUTHENTICATION_GUIDE.md)
- Open an issue on GitHub
- Contact the development team

---

**Last Updated**: January 2026  
**Version**: 1.0.0
$ yarn run test

# e2e tests
$ yarn run test:e2e

# test coverage
$ yarn run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ yarn install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
