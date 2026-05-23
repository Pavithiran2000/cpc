import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { BrevoEmailProvider } from './providers/brevo-email.provider';

@Module({
  providers: [EmailService, BrevoEmailProvider],
  exports: [EmailService],
})
export class EmailModule {}
