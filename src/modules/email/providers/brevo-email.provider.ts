import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface TransactionalEmail {
  to: string;
  subject: string;
  htmlContent: string;
  textContent: string;
}

@Injectable()
export class BrevoEmailProvider {
  constructor(private readonly config: ConfigService) {}

  async sendTransactionalEmail(message: TransactionalEmail) {
    const apiKey = this.config.get<string>('BREVO_API_KEY');
    const senderEmail = this.config.get<string>('BREVO_SENDER_EMAIL');
    const senderName = this.config.get<string>('BREVO_SENDER_NAME') ?? 'CPC Station Manager';

    if (!apiKey || !senderEmail) {
      throw new ServiceUnavailableException('Email service is not configured');
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { email: senderEmail, name: senderName },
        to: [{ email: message.to }],
        subject: message.subject,
        htmlContent: message.htmlContent,
        textContent: message.textContent,
      }),
    });

    if (!response.ok) {
      throw new ServiceUnavailableException('Failed to send email');
    }
  }
}
