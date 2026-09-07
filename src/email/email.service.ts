import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as SibApiV3Sdk from 'sib-api-v3-sdk';

export interface EmailOptions {
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
}

@Injectable()
export class EmailService {
  private readonly apiClient: SibApiV3Sdk.TransactionalEmailsApi;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('BREVO_API_KEY');
    this.fromEmail =
      this.configService.get<string>('BREVO_SENDER_EMAIL') ||
      this.configService.get<string>('EMAIL_FROM') ||
      'no-reply@epms.example';
    this.fromName =
      (this.configService.get<string>('BREVO_SENDER_NAME') ||
        this.configService.get<string>('EMAIL_FROM_NAME'))?.replace(/"/g, '') ||
      'EPMS';

    this.isConfigured = !!apiKey;

    if (this.isConfigured) {
      const defaultClient = SibApiV3Sdk.ApiClient.instance;
      defaultClient.authentications['api-key'].apiKey = apiKey;
      this.apiClient = new SibApiV3Sdk.TransactionalEmailsApi();
    }
  }

  /**
   * Generate base email template with professional styling
   */
  private getEmailTemplate(content: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Fitness Coaching</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f5f5f5;
            padding: 20px;
          }
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }
          .email-header {
            background: linear-gradient(135deg, #7F435F 0%, #5a2f43 100%);
            padding: 40px 30px;
            text-align: center;
          }
          .email-logo {
            font-size: 32px;
            font-weight: 800;
            color: #ffffff;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 10px;
          }
          .email-tagline {
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px;
            font-weight: 400;
          }
          .email-body {
            padding: 40px 30px;
          }
          .email-content {
            color: #444444;
            font-size: 16px;
            line-height: 1.8;
          }
          .email-content p {
            margin-bottom: 16px;
          }
          .otp-container {
            background: linear-gradient(135deg, #f8f4f6 0%, #fdfbfc 100%);
            border: 2px solid #7F435F;
            border-radius: 12px;
            padding: 30px;
            margin: 30px 0;
            text-align: center;
          }
          .otp-label {
            font-size: 14px;
            color: #666666;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 12px;
            font-weight: 600;
          }
          .otp-code {
            font-size: 42px;
            font-weight: 800;
            color: #7F435F;
            letter-spacing: 8px;
            font-family: 'Courier New', monospace;
            margin: 10px 0;
          }
          .otp-expiry {
            font-size: 13px;
            color: #888888;
            margin-top: 12px;
          }
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #7F435F 0%, #5a2f43 100%);
            color: #ffffff !important;
            text-decoration: none;
            padding: 16px 40px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
            box-shadow: 0 4px 12px rgba(127, 67, 95, 0.3);
            transition: all 0.3s ease;
          }
          .cta-button:hover {
            box-shadow: 0 6px 16px rgba(127, 67, 95, 0.4);
            transform: translateY(-2px);
          }
          .info-box {
            background-color: #fff8f9;
            border-left: 4px solid #7F435F;
            padding: 16px 20px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .info-box p {
            margin: 0;
            font-size: 14px;
            color: #666666;
          }
          .email-footer {
            background-color: #f9f9f9;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e5e5;
          }
          .footer-text {
            color: #888888;
            font-size: 13px;
            line-height: 1.6;
            margin-bottom: 15px;
          }
          .social-links {
            margin: 20px 0;
          }
          .social-link {
            display: inline-block;
            width: 36px;
            height: 36px;
            margin: 0 8px;
            background-color: #7F435F;
            border-radius: 50%;
            line-height: 36px;
            color: #ffffff;
            text-decoration: none;
            font-size: 16px;
            transition: all 0.3s ease;
          }
          .social-link:hover {
            background-color: #5a2f43;
            transform: scale(1.1);
          }
          .divider {
            height: 1px;
            background: linear-gradient(to right, transparent, #e5e5e5, transparent);
            margin: 30px 0;
          }
          @media only screen and (max-width: 600px) {
            body {
              padding: 10px;
            }
            .email-header {
              padding: 30px 20px;
            }
            .email-body {
              padding: 30px 20px;
            }
            .otp-code {
              font-size: 36px;
              letter-spacing: 6px;
            }
            .cta-button {
              padding: 14px 30px;
              font-size: 15px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="email-header">
            <div class="email-logo">SourceCode</div>
            <div class="email-tagline">Employee Managment System</div>
          </div>
          <div class="email-body">
            ${content}
          </div>
          <div class="email-footer">
            <div class="footer-text">
              © ${new Date().getFullYear()} Employee Managment System. All rights reserved.<br>
              This email was sent to you as part of your account activity.
            </div>
            <div class="divider"></div>
            <div class="footer-text" style="font-size: 12px; color: #aaaaaa;">
              If you have any questions, please contact our support team.<br>
              Please do not reply to this email.
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Send OTP verification email
   */
  async sendOtpEmail(email: string, otp: string, name?: string): Promise<void> {
    const content = `
      <div class="email-content">
        <p>Hi${name ? ' ' + name : ''},</p>
        <p>Thank you for joining <strong>SourceCode</strong>! We're excited to have you on board.</p>
        <p>To complete your registration and verify your email address, please use the verification code below:</p>
      </div>
      
      <div class="otp-container">
        <div class="otp-label">Your Verification Code</div>
        <div class="otp-code">${otp}</div>
        <div class="otp-expiry">⏱ This code will expire in 10 minutes</div>
      </div>
      
      <div class="info-box">
        <p><strong>🔒 Security Tip:</strong> Never share this code with anyone. Our team will never ask for your verification code.</p>
      </div>
      
      <div class="email-content">
        <p>If you didn't create an account with SourceCode, please ignore this email or contact our support team if you have concerns.</p>
        <p>Welcome to your fitness journey!</p>
        <p style="margin-top: 30px;">
          Best regards,<br>
          <strong style="color: #7F435F;">The SourceCode Team</strong>
        </p>
      </div>
    `;

    await this.sendEmail({
      to: email,
      toName: name,
      subject: '🔐 Verify Your Email Address - EPMS',
      htmlContent: this.getEmailTemplate(content),
    });
  }

  /**
   * Send password reset OTP email
   */
  async sendPasswordResetEmail(email: string, otp: string, name?: string): Promise<void> {
    const content = `
      <div class="email-content">
        <p>Hi${name ? ' ' + name : ''},</p>
        <p>We received a request to reset your password for your <strong>Fitness Coaching</strong> account.</p>
        <p>Use the code below to reset your password:</p>
      </div>
      
      <div class="otp-container">
        <div class="otp-label">Password Reset Code</div>
        <div class="otp-code">${otp}</div>
        <div class="otp-expiry">⏱ This code will expire in 10 minutes</div>
      </div>
      
      <div class="info-box">
        <p><strong>⚠️ Important:</strong> If you didn't request a password reset, please ignore this email and ensure your account is secure. Consider changing your password if you suspect unauthorized access.</p>
      </div>
      
      <div class="email-content">
        <p>Once you enter this code, you'll be able to create a new password for your account.</p>
        <p style="margin-top: 30px;">
          Best regards,<br>
          <strong style="color: #7F435F;">SourceCode Team</strong>
        </p>
      </div>
    `;

    await this.sendEmail({
      to: email,
      toName: name,
      subject: '🔑 Reset Your Password - SourceCode',
      htmlContent: this.getEmailTemplate(content),
    });
  }

  /**
   * Send welcome email after email verification
   */
  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const content = `
      <div class="email-content">
        <p>Hi ${name},</p>
        <p>🎉 <strong>Congratulations!</strong> Your email has been successfully verified, and your account is now active.</p>
        <p>You're all set to start your fitness transformation journey with <strong>SourceCode</strong>!</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${this.configService.get<string>('FRONTEND_URL') || '#'}" class="cta-button">
          Get Started Now
        </a>
      </div>
      
      <div class="email-content">
        <p><strong>What's next?</strong></p>
        <ul style="padding-left: 20px; margin: 15px 0;">
          <li style="margin-bottom: 10px;">Complete your profile to get personalized recommendations</li>
          <li style="margin-bottom: 10px;">Browse our extensive workout library</li>
          <li style="margin-bottom: 10px;">Connect with certified trainers</li>
          <li style="margin-bottom: 10px;">Track your progress and achieve your goals</li>
        </ul>
      </div>
      
      <div class="info-box">
        <p><strong>💡 Pro Tip:</strong> Set up your fitness goals and preferences in your profile for a customized experience!</p>
      </div>
      
      <div class="email-content">
        <p>If you have any questions or need assistance, our support team is here to help.</p>
        <p style="margin-top: 30px;">
          Let's get moving!<br>
          <strong style="color: #7F435F;">The Fitness Coaching Team</strong>
        </p>
      </div>
    `;

    await this.sendEmail({
      to: email,
      toName: name,
      subject: '🎉 Welcome to Fitness Coaching - Let\'s Get Started!',
      htmlContent: this.getEmailTemplate(content),
    });
  }

  /**
   * Send password changed confirmation email
   */
  async sendPasswordChangedEmail(email: string, name?: string): Promise<void> {
    const content = `
      <div class="email-content">
        <p>Hi${name ? ' ' + name : ''},</p>
        <p>This email confirms that your password for <strong>SourceCode</strong> has been successfully changed.</p>
      </div>
      
      <div class="info-box">
        <p><strong>🔒 Security Alert:</strong> If you didn't make this change, please contact our support team immediately and secure your account.</p>
      </div>
      
      <div class="email-content">
        <p><strong>Security Recommendations:</strong></p>
        <ul style="padding-left: 20px; margin: 15px 0;">
          <li style="margin-bottom: 10px;">Use a unique password for your account</li>
          <li style="margin-bottom: 10px;">Enable two-factor authentication (coming soon!)</li>
          <li style="margin-bottom: 10px;">Never share your password with anyone</li>
          <li style="margin-bottom: 10px;">Review your account activity regularly</li>
        </ul>
      </div>
      
      <div class="email-content">
        <p>If you have any concerns or questions about your account security, please reach out to our support team.</p>
        <p style="margin-top: 30px;">
          Stay secure,<br>
          <strong style="color: #7F435F;">SourceCode Team</strong>
        </p>
      </div>
    `;

    await this.sendEmail({
      to: email,
      toName: name,
      subject: '✅ Your Password Has Been Changed - SourceCode',
      htmlContent: this.getEmailTemplate(content),
    });
  }

  /**
   * Core email sending method
   */
  private async sendEmail(options: EmailOptions): Promise<void> {
    const { to, toName, subject, htmlContent } = options;

    // Always log for debugging/audit
    console.log(`[EmailService] Sending email to ${to}: ${subject}`);

    if (!this.isConfigured) {
      console.warn('[EmailService] BREVO_API_KEY not configured — email not sent');
      return;
    }

    try {
      const toPayloadItem: any = { email: to };
      if (toName) {
        toPayloadItem.name = toName;
      }

      const sendSmtpEmail = {
        to: [toPayloadItem],
        sender: { name: this.fromName, email: this.fromEmail },
        subject,
        htmlContent,
      } as any;

      await this.apiClient.sendTransacEmail(sendSmtpEmail);
      console.log(`[EmailService] ✅ Email sent successfully to ${to}`);
    } catch (err) {
      console.error('[EmailService] ❌ Failed to send email via Brevo:', err?.message || err);
      if ((err as any).response?.body) {
        console.error('[EmailService] Brevo error details:', (err as any).response.body);
      }
      // Don't throw - allow the app to continue even if email fails
    }
  }

  /**
   * Public wrapper to send arbitrary transactional emails using the same template
   */
  async sendCustomEmail(options: EmailOptions): Promise<void> {
    await this.sendEmail(options);
  }
}
