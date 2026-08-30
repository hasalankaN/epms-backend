# Email Service

A professional email service module for Fitness Coaching backend with beautiful, branded email templates.

## Features

- 🎨 **Professional Templates**: Beautiful, responsive email templates with brand colors (#7F435F)
- 📧 **Multiple Email Types**: OTP verification, password reset, welcome emails, and password change notifications
- 🔧 **Easy Integration**: Clean service interface for easy use across the application
- 📱 **Mobile Responsive**: All templates work perfectly on mobile devices
- 🎯 **Brevo Integration**: Seamless integration with Brevo (formerly Sendinblue) for reliable email delivery

## Email Templates

### 1. OTP Verification Email
- **Method**: `sendOtpEmail(email, otp, name?)`
- **Subject**: 🔐 Verify Your Email Address - Fitness Coaching
- **Use Case**: Sent during user registration to verify email address
- **Features**: 
  - Large, easy-to-read OTP code
  - 10-minute expiry timer
  - Security tips

### 2. Password Reset Email
- **Method**: `sendPasswordResetEmail(email, otp, name?)`
- **Subject**: 🔑 Reset Your Password - Fitness Coaching
- **Use Case**: Sent when user requests password reset
- **Features**:
  - Prominent reset code display
  - Security warnings
  - 10-minute expiry timer

### 3. Welcome Email
- **Method**: `sendWelcomeEmail(email, name)`
- **Subject**: 🎉 Welcome to Fitness Coaching - Let's Get Started!
- **Use Case**: Sent after successful email verification
- **Features**:
  - Call-to-action button to get started
  - Feature highlights
  - Pro tips for new users

### 4. Password Changed Confirmation
- **Method**: `sendPasswordChangedEmail(email, name?)`
- **Subject**: ✅ Your Password Has Been Changed - Fitness Coaching
- **Use Case**: Sent after successful password change or reset
- **Features**:
  - Security alert if user didn't make the change
  - Security best practices
  - Account protection recommendations

## Template Design

All email templates share a common professional design:

### Brand Colors
- **Primary**: `#7F435F` (Purple/burgundy)
- **Gradient**: `linear-gradient(135deg, #7F435F 0%, #5a2f43 100%)`

### Design Elements
- Clean, modern layout with rounded corners
- Gradient header with brand name
- Professional typography with proper spacing
- Information boxes for important messages
- Mobile-responsive design
- Subtle shadows and hover effects
- Professional footer with copyright info

### Structure
```
┌─────────────────────────────────┐
│   Header (Brand gradient)       │
│   - Logo                         │
│   - Tagline                      │
├─────────────────────────────────┤
│   Body                           │
│   - Greeting                     │
│   - Content                      │
│   - OTP/CTA (styled box)         │
│   - Info boxes                   │
│   - Signature                    │
├─────────────────────────────────┤
│   Footer                         │
│   - Copyright                    │
│   - Support info                 │
└─────────────────────────────────┘
```

## Usage

### Setup

1. Add email service to your module:
```typescript
import { EmailModule } from '../email/email.module';

@Module({
  imports: [EmailModule],
  // ...
})
```

2. Inject the service:
```typescript
import { EmailService } from '../email/email.service';

constructor(private readonly emailService: EmailService) {}
```

### Examples

#### Send OTP Email
```typescript
await this.emailService.sendOtpEmail(
  'user@example.com',
  '1234',
  'John'
);
```

#### Send Password Reset Email
```typescript
await this.emailService.sendPasswordResetEmail(
  'user@example.com',
  '5678',
  'Jane'
);
```

#### Send Welcome Email
```typescript
await this.emailService.sendWelcomeEmail(
  'user@example.com',
  'John Doe'
);
```

#### Send Password Changed Email
```typescript
await this.emailService.sendPasswordChangedEmail(
  'user@example.com',
  'Jane Doe'
);
```

## Environment Configuration

Required environment variables:

```bash
# Brevo API credentials
BREVO_API_KEY=xkeysib-your-api-key-here
BREVO_SENDER_EMAIL=no-reply@yourdomain.com
BREVO_SENDER_NAME="Fitness Coaching"

# Frontend URL (for CTAs in emails)
FRONTEND_URL=https://your-frontend-url.com
```

## Error Handling

The email service is designed to be fault-tolerant:

- If `BREVO_API_KEY` is not configured, emails won't be sent (useful for development)
- Email send failures are logged but don't throw exceptions
- This ensures the application continues to work even if email delivery fails

## Logging

All email operations are logged:

```
[EmailService] Sending email to user@example.com: Subject
[EmailService] ✅ Email sent successfully to user@example.com
[EmailService] ❌ Failed to send email via Brevo: error details
```

## Adding New Email Templates

To add a new email template:

1. Create a new method in `EmailService`:
```typescript
async sendCustomEmail(email: string, name: string, data: any): Promise<void> {
  const content = `
    <div class="email-content">
      <!-- Your custom content here -->
    </div>
  `;

  await this.sendEmail({
    to: email,
    toName: name,
    subject: 'Your Subject',
    htmlContent: this.getEmailTemplate(content),
  });
}
```

2. Use the shared template styles (all CSS classes are available):
   - `.email-content` - Main content wrapper
   - `.otp-container` - Styled box for codes
   - `.info-box` - Information/warning boxes
   - `.cta-button` - Call-to-action button
   - And more...

## Best Practices

1. **Always personalize**: Include user's name when available
2. **Keep it brief**: Users scan emails quickly
3. **Clear CTAs**: Make it obvious what action users should take
4. **Security first**: Always include security tips for sensitive operations
5. **Mobile-first**: All templates are responsive by default
6. **Brand consistent**: Use the defined color scheme and styling

## Testing

Test emails in development:

```bash
# Start the server
yarn dev

# Test registration (sends OTP email)
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "password": "Password123!",
    "phoneNumber": "1234567890",
    "countryCode": "+1"
  }'

# Check server logs for OTP and email status
```

## Future Enhancements

Potential improvements:

- [ ] Email templates with dynamic content blocks
- [ ] Multi-language support
- [ ] Email preview/testing endpoint
- [ ] Email queue for better reliability
- [ ] HTML email templates from external files
- [ ] Email analytics tracking
- [ ] Custom branding per tenant
- [ ] Rich text editor for admins

## Support

For issues or questions about the email service:
- Check Brevo dashboard for delivery status
- Review server logs for error details
- Verify environment variables are correctly set
- Ensure sender email is verified in Brevo
