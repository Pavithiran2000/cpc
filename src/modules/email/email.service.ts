import { Injectable } from '@nestjs/common';
import { BrevoEmailProvider } from './providers/brevo-email.provider';

interface VerificationCodeEmail {
  to: string;
  code: string;
  stationName: string;
}

interface PasswordResetEmail {
  to: string;
  resetUrl: string;
  stationName: string;
}

interface PlatformAdminPasswordResetEmail {
  to: string;
  resetUrl: string;
}

interface PlatformAdminInviteEmail {
  to: string;
  name: string;
  tempPassword: string;
  loginUrl: string;
}

@Injectable()
export class EmailService {
  constructor(private readonly brevo: BrevoEmailProvider) {}

  sendVerificationCode(message: VerificationCodeEmail) {
    return this.brevo.sendTransactionalEmail({
      to: message.to,
      subject: 'Your CPC station verification code',
      htmlContent: `
        <p>Your verification code for <strong>${escapeHtml(message.stationName)}</strong> is:</p>
        <h2 style="letter-spacing: 4px;">${message.code}</h2>
        <p>This code expires in 10 minutes.</p>
      `,
      textContent: `Your verification code for ${message.stationName} is ${message.code}. This code expires in 10 minutes.`,
    });
  }

  sendPasswordResetEmail(message: PasswordResetEmail) {
    return this.brevo.sendTransactionalEmail({
      to: message.to,
      subject: 'Reset your CPC Station Manager password',
      htmlContent: `
        <p>You requested a password reset for <strong>${escapeHtml(message.stationName)}</strong>.</p>
        <p><a href="${escapeHtml(message.resetUrl)}" style="color:#E85D04;">Reset your password</a></p>
        <p>This link expires in 1 hour. If you did not request this, you can safely ignore this email.</p>
      `,
      textContent: `You requested a password reset for ${message.stationName}.\n\nReset your password: ${message.resetUrl}\n\nThis link expires in 1 hour. If you did not request this, ignore this email.`,
    });
  }
  sendPlatformAdminInviteEmail(message: PlatformAdminInviteEmail) {
    const url = escapeHtml(message.loginUrl);
    return this.brevo.sendTransactionalEmail({
      to: message.to,
      subject: "You've been invited to CPC Platform Administration",
      htmlContent: `
        <div style="background:#0A0A0B;padding:32px;font-family:sans-serif;color:#f1f1f1;">
          <div style="max-width:560px;margin:0 auto;">
            <h1 style="color:#E85D04;font-size:28px;margin-bottom:8px;">CPC Platform</h1>
            <h2 style="color:#f1f1f1;font-size:20px;margin-bottom:24px;">Admin Invitation</h2>
            <p style="color:#a1a1aa;">Hi ${escapeHtml(message.name)},</p>
            <p style="color:#a1a1aa;">You have been invited to the CPC Platform Administration panel.</p>
            <div style="background:#18181C;border-radius:8px;padding:20px;margin:24px 0;">
              <p style="color:#a1a1aa;margin:0 0 8px;">Your login credentials:</p>
              <p style="color:#f1f1f1;margin:0;"><strong>Email:</strong> ${escapeHtml(message.to)}</p>
              <p style="color:#f1f1f1;margin:8px 0 0;"><strong>Temporary password:</strong> <code style="background:#27272a;padding:2px 6px;border-radius:4px;">${escapeHtml(message.tempPassword)}</code></p>
            </div>
            <a href="${url}" style="display:inline-block;margin:8px 0 24px;padding:12px 28px;background:#E85D04;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Access CPC Platform</a>
            <p style="color:#ef4444;font-size:13px;">Please change your password immediately after your first login.</p>
            <hr style="border-color:#27272a;margin:24px 0;" />
            <p style="color:#52525b;font-size:12px;">CPC Platform Administration</p>
          </div>
        </div>
      `,
      textContent: `Hi ${message.name},\n\nYou've been invited to CPC Platform Administration.\n\nEmail: ${message.to}\nTemporary password: ${message.tempPassword}\n\nLogin at: ${message.loginUrl}\n\nPlease change your password immediately after your first login.\n\nCPC Platform Administration`,
    });
  }

  sendPlatformMfaOtpEmail(to: string, code: string) {
    return this.brevo.sendTransactionalEmail({
      to,
      subject: 'Your CPC Platform verification code',
      htmlContent: `
        <div style="background:#0A0A0B;padding:32px;font-family:sans-serif;color:#f1f1f1;">
          <div style="max-width:480px;margin:0 auto;">
            <h1 style="color:#E85D04;font-size:24px;margin-bottom:8px;">CPC Platform</h1>
            <h2 style="color:#f1f1f1;font-size:18px;margin-bottom:24px;">Your verification code</h2>
            <div style="background:#18181C;border-radius:8px;padding:24px;text-align:center;margin:24px 0;">
              <span style="font-family:monospace;font-size:40px;font-weight:700;letter-spacing:12px;color:#E85D04;">${code}</span>
            </div>
            <p style="color:#a1a1aa;font-size:14px;">This code expires in 10 minutes. Do not share it with anyone.</p>
            <hr style="border-color:#27272a;margin:24px 0;" />
            <p style="color:#52525b;font-size:12px;">CPC Platform Administration</p>
          </div>
        </div>
      `,
      textContent: `Your CPC Platform verification code is: ${code}\n\nThis code expires in 10 minutes. Do not share it with anyone.\n\nCPC Platform Administration`,
    });
  }

  sendPlatformAdminPasswordResetEmail(message: PlatformAdminPasswordResetEmail) {
    const url = escapeHtml(message.resetUrl);
    return this.brevo.sendTransactionalEmail({
      to: message.to,
      subject: 'Reset your CPC Platform Admin password',
      htmlContent: `
        <div style="background:#0A0A0B;padding:32px;font-family:sans-serif;color:#f1f1f1;">
          <div style="max-width:560px;margin:0 auto;">
            <h1 style="color:#E85D04;font-size:28px;margin-bottom:8px;">CPC</h1>
            <h2 style="color:#f1f1f1;font-size:20px;margin-bottom:24px;">Password Reset Request</h2>
            <p style="color:#a1a1aa;">Click the button below to reset your platform admin password.</p>
            <p style="color:#a1a1aa;">This link expires in 1 hour.</p>
            <a href="${url}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#E85D04;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Reset Password</a>
            <p style="color:#71717a;font-size:13px;word-break:break-all;">${url}</p>
            <p style="color:#ef4444;font-size:13px;">If you did not request this, your account may be compromised. Contact your system administrator immediately.</p>
            <hr style="border-color:#27272a;margin:24px 0;" />
            <p style="color:#52525b;font-size:12px;">CPC Platform Administration</p>
          </div>
        </div>
      `,
      textContent: `Reset your CPC Platform Admin password\n\nClick the link below to reset your password. This link expires in 1 hour.\n\n${message.resetUrl}\n\nIf you did not request this, your account may be compromised. Contact your system administrator immediately.\n\nCPC Platform Administration`,
    });
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
