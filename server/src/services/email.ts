import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    // Check if SMTP is configured
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const smtpFromEmail = process.env.SMTP_FROM_EMAIL;

    if (!smtpHost || !smtpPort || !smtpFromEmail) {
      console.warn('SMTP not configured. Email functionality will be disabled.');
      this.isConfigured = false;
      return;
    }

    // Create SMTP transporter
    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: smtpPort === '465', // Use SSL for port 465
      auth: smtpUser && smtpPassword ? {
        user: smtpUser,
        pass: smtpPassword,
      } : undefined,
    });

    this.isConfigured = true;
    console.log('Email service initialized with SMTP configuration');
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    if (!this.isConfigured || !this.transporter) {
      throw new Error('Email service is not configured. Please configure SMTP settings.');
    }

    const fromEmail = process.env.SMTP_FROM_EMAIL!;
    const fromName = process.env.SMTP_FROM_NAME || 'ChoreQuest';

    try {
      await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      console.log(`Email sent to ${options.to}: ${options.subject}`);
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Failed to send email');
    }
  }

  async sendParentInvitation(
    toEmail: string,
    inviterEmail: string,
    invitationToken: string,
    appUrl: string
  ): Promise<void> {
    const invitationUrl = `${appUrl}/accept-invitation?token=${invitationToken}`;
    
    const subject = 'You\'ve been invited to ChoreQuest';
    const text = `
${inviterEmail} has invited you to join their ChoreQuest family account!

You can manage chores, approve completions, and configure rewards together.

To accept this invitation and set up your account, click the link below:
${invitationUrl}

This invitation will expire in 7 days.

If you didn't expect this invitation, you can safely ignore this email.
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px 10px 0 0;
      text-align: center;
    }
    .content {
      background: #f9fafb;
      padding: 30px;
      border-radius: 0 0 10px 10px;
    }
    .button {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
      font-weight: 500;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🏆 ChoreQuest Invitation</h1>
  </div>
  <div class="content">
    <p><strong>${inviterEmail}</strong> has invited you to join their ChoreQuest family account!</p>
    
    <p>As a co-parent, you'll be able to:</p>
    <ul>
      <li>Manage chores and rewards</li>
      <li>Approve chore completions</li>
      <li>Monitor children's progress</li>
      <li>Configure account settings</li>
    </ul>
    
    <p>Click the button below to accept the invitation and set up your password:</p>
    
    <div style="text-align: center;">
      <a href="${invitationUrl}" class="button">Accept Invitation</a>
    </div>
    
    <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
      Or copy and paste this link into your browser:<br>
      <a href="${invitationUrl}" style="color: #667eea; word-break: break-all;">${invitationUrl}</a>
    </p>
    
    <div class="footer">
      <p>This invitation will expire in 7 days.</p>
      <p>If you didn't expect this invitation, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    await this.sendEmail({
      to: toEmail,
      subject,
      text,
      html,
    });
  }

  isEnabled(): boolean {
    return this.isConfigured;
  }
}

// Export a singleton instance
export const emailService = new EmailService();
