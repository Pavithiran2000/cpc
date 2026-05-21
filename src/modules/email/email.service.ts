import { Injectable } from '@nestjs/common';
import { BrevoEmailProvider } from './providers/brevo-email.provider';

interface VerificationCodeEmail {
  to: string;
  code: string;
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
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
