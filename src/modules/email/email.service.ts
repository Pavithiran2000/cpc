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
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
