import { BadRequestException, HttpException, HttpStatus, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomInt } from 'crypto';
import * as otplib from 'otplib';
import * as QRCode from 'qrcode';
import { Repository } from 'typeorm';
import { PlatformActivityLog, PlatformAdmin, PlatformAdminStatus, MfaMethod, AlertSeverity } from '../../../database/entities';
import { EmailService } from '../../email/email.service';
import { PlatformAlertsService } from '../alerts/platform-alerts.service';
import { PlatformChangePasswordDto } from './dto/platform-change-password.dto';
import { PlatformLoginDto } from './dto/platform-login.dto';
import { PlatformUpdateProfileDto } from './dto/platform-update-profile.dto';
import { PlatformRefreshTokenService } from './platform-refresh-token.service';

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 30;
const BACKUP_CODE_COUNT = 8;
const EMAIL_OTP_COOLDOWN_MS = 2 * 60 * 1000;
const EMAIL_OTP_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class PlatformAuthService {
  constructor(
    @InjectRepository(PlatformAdmin)
    private readonly admins: Repository<PlatformAdmin>,
    @InjectRepository(PlatformActivityLog)
    private readonly activityLogs: Repository<PlatformActivityLog>,
    private readonly alertsService: PlatformAlertsService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly refreshTokens: PlatformRefreshTokenService,
    private readonly email: EmailService,
  ) {}

  async login(dto: PlatformLoginDto, ipAddress?: string, userAgent?: string) {
    const admin = await this.admins.findOne({ where: { email: dto.email.toLowerCase() } });
    if (!admin) throw new UnauthorizedException('Invalid credentials');

    if (admin.status !== PlatformAdminStatus.Active) {
      throw new UnauthorizedException('Account is not active');
    }

    if (admin.lockedUntil && admin.lockedUntil > new Date()) {
      throw new HttpException('Account is temporarily locked. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const valid = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!valid) {
      admin.failedLoginAttempts += 1;
      if (admin.failedLoginAttempts >= MAX_ATTEMPTS) {
        admin.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
        await this.admins.save(admin);
        await this.logActivity(admin, 'LOGIN_FAILED', ipAddress, userAgent);
        await this.createAlert({
          type: 'ACCOUNT_LOCKED',
          severity: AlertSeverity.Warning,
          message: `Admin account locked after ${MAX_ATTEMPTS} failed attempts: ${admin.email}`,
          relatedEntityType: 'platform_admin',
          relatedEntityId: admin.id,
          relatedEntityLabel: admin.email,
        });
      } else {
        await this.admins.save(admin);
        await this.logActivity(admin, 'LOGIN_FAILED', ipAddress, userAgent);
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    if (admin.twoFactorEnabled) {
      if (admin.mfaMethod === MfaMethod.Email || admin.mfaMethod === MfaMethod.Both) {
        try {
          await this.sendEmailOtp(admin.id);
        } catch {
          // cooldown or send failure — login still proceeds; user can request resend
        }
      }
      const tempToken = await this.signTempToken(admin.id);
      return { requires_mfa: true, temp_token: tempToken, mfa_method: admin.mfaMethod };
    }

    admin.failedLoginAttempts = 0;
    admin.lockedUntil = undefined as unknown as Date;
    admin.lastLoginAt = new Date();
    admin.lastLoginIp = ipAddress ?? (undefined as unknown as string);
    await this.admins.save(admin);

    await this.logActivity(admin, 'PLATFORM_LOGIN', ipAddress, userAgent);

    const accessToken = await this.signAccessToken(admin);
    const refreshToken = await this.refreshTokens.issue(admin.id, undefined, ipAddress, userAgent);

    return { accessToken, refreshToken, admin: this.toShape(admin) };
  }

  async refresh(rawRefreshToken: string, ipAddress?: string, userAgent?: string) {
    const { refreshToken: newRefreshToken, record } = await this.refreshTokens.rotate(rawRefreshToken, ipAddress, userAgent);
    const admin = await this.admins.findOne({ where: { id: record.adminId, status: PlatformAdminStatus.Active } });
    if (!admin) throw new UnauthorizedException('Admin not found');
    const accessToken = await this.signAccessToken(admin);
    return { accessToken, refreshToken: newRefreshToken, admin: this.toShape(admin) };
  }

  async logout(adminId: string, ipAddress?: string, userAgent?: string) {
    await this.refreshTokens.revokeAllForAdmin(adminId);
    const admin = await this.admins.findOneBy({ id: adminId });
    if (admin) await this.logActivity(admin, 'PLATFORM_LOGOUT', ipAddress, userAgent);
  }

  async getMe(adminId: string) {
    const admin = await this.admins.findOneBy({ id: adminId });
    if (!admin) throw new NotFoundException('Admin not found');
    return this.toShape(admin);
  }

  async updateProfile(adminId: string, dto: PlatformUpdateProfileDto) {
    const admin = await this.admins.findOneBy({ id: adminId });
    if (!admin) throw new NotFoundException('Admin not found');
    const trimmed = dto.name.trim();
    if (!trimmed) throw new BadRequestException('Name cannot be blank');
    admin.name = trimmed;
    await this.admins.save(admin);
    await this.logActivity(admin, 'PROFILE_UPDATED');
    return this.toShape(admin);
  }

  async changePassword(adminId: string, dto: PlatformChangePasswordDto) {
    if (dto.new_password !== dto.confirm_password) {
      throw new BadRequestException('Passwords do not match');
    }
    const admin = await this.admins.findOneBy({ id: adminId });
    if (!admin) throw new NotFoundException('Admin not found');

    const currentValid = await bcrypt.compare(dto.current_password, admin.passwordHash);
    if (!currentValid) throw new UnauthorizedException('Current password is incorrect');

    admin.passwordHash = await bcrypt.hash(dto.new_password, 12);
    await this.admins.save(admin);

    await this.refreshTokens.revokeAllForAdmin(adminId);
    await this.logActivity(admin, 'PASSWORD_CHANGED');

    return { success: true };
  }

  async forgotPassword(email: string): Promise<{ success: true }> {
    const admin = await this.admins.findOne({ where: { email: email.toLowerCase() } });
    if (!admin || admin.status !== PlatformAdminStatus.Active) return { success: true };

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    admin.resetPasswordToken = tokenHash;
    admin.resetPasswordExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await this.admins.save(admin);

    const frontendPlatformUrl = this.config.get<string>('app.frontendPlatformUrl') ?? 'http://localhost:3000/platform';
    const resetUrl = `${frontendPlatformUrl}/reset-password?token=${rawToken}`;

    await this.email.sendPlatformAdminPasswordResetEmail({ to: admin.email, resetUrl });

    return { success: true };
  }

  async resetPassword(token: string, newPassword: string, confirmPassword: string): Promise<{ success: true }> {
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const admin = await this.admins.findOne({ where: { resetPasswordToken: tokenHash } });

    if (!admin || !admin.resetPasswordExpiresAt || admin.resetPasswordExpiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    admin.passwordHash = await bcrypt.hash(newPassword, 12);
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpiresAt = undefined;
    admin.failedLoginAttempts = 0;
    admin.lockedUntil = undefined;
    await this.admins.save(admin);

    await this.refreshTokens.revokeAllForAdmin(admin.id);
    await this.logActivity(admin, 'PASSWORD_RESET');

    return { success: true };
  }

  async generateTotpSetup(adminId: string) {
    const admin = await this.admins.findOneBy({ id: adminId });
    if (!admin) throw new NotFoundException('Admin not found');

    const secret = otplib.generateSecret();
    admin.twoFactorPendingSecret = this.encryptSecret(secret);
    await this.admins.save(admin);

    const otpauth = otplib.generateURI({ secret, label: admin.email, issuer: 'CPC Platform' });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

    return { secret_display: secret, qr_code_data_url: qrCodeDataUrl, otpauth_url: otpauth };
  }

  async enableTotp(adminId: string, totpCode: string) {
    const admin = await this.admins.findOneBy({ id: adminId });
    if (!admin) throw new NotFoundException('Admin not found');
    if (!admin.twoFactorPendingSecret) throw new BadRequestException('No pending TOTP setup. Call generate first.');

    const pendingSecret = this.decryptSecret(admin.twoFactorPendingSecret);
    const { valid } = otplib.verifySync({ token: totpCode, secret: pendingSecret });
    if (!valid) throw new UnauthorizedException('Invalid code');

    const plainCodes = Array.from({ length: BACKUP_CODE_COUNT }, () =>
      randomBytes(4).toString('hex').toUpperCase(),
    );
    const hashedCodes = await Promise.all(plainCodes.map((c) => bcrypt.hash(c, 10)));

    admin.twoFactorSecret = admin.twoFactorPendingSecret;
    admin.twoFactorPendingSecret = undefined as unknown as string;
    admin.twoFactorEnabled = true;
    admin.mfaMethod = MfaMethod.Totp;
    admin.backupCodes = hashedCodes;
    await this.admins.save(admin);

    await this.logActivity(admin, 'MFA_TOTP_ENABLED');

    return { success: true, backup_codes: plainCodes };
  }

  async disableMfa(adminId: string, code: string, password: string) {
    const admin = await this.admins.findOneBy({ id: adminId });
    if (!admin) throw new NotFoundException('Admin not found');
    if (!admin.twoFactorEnabled) throw new BadRequestException('MFA is not enabled');

    const passwordValid = await bcrypt.compare(password, admin.passwordHash);
    if (!passwordValid) throw new UnauthorizedException('Invalid password');

    let verified = false;

    if (admin.twoFactorSecret) {
      try {
        const secret = this.decryptSecret(admin.twoFactorSecret);
        verified = otplib.verifySync({ token: code, secret }).valid;
      } catch {
        verified = false;
      }
    }

    if (!verified && admin.backupCodes?.length) {
      for (const hash of admin.backupCodes) {
        if (await bcrypt.compare(code, hash)) {
          verified = true;
          break;
        }
      }
    }

    if (!verified) throw new UnauthorizedException('Invalid code');

    admin.twoFactorEnabled = false;
    admin.twoFactorSecret = undefined as unknown as string;
    admin.twoFactorPendingSecret = undefined as unknown as string;
    admin.backupCodes = undefined as unknown as string[];
    admin.mfaMethod = undefined as unknown as MfaMethod;
    await this.admins.save(admin);

    await this.refreshTokens.revokeAllForAdmin(adminId);
    await this.logActivity(admin, 'MFA_DISABLED');
    await this.createAlert({
      type: 'MFA_DISABLED',
      severity: AlertSeverity.Info,
      message: `MFA disabled for admin account: ${admin.email}`,
      relatedEntityType: 'platform_admin',
      relatedEntityId: admin.id,
      relatedEntityLabel: admin.email,
    });

    return { success: true };
  }

  async sendEmailOtp(adminId: string) {
    const admin = await this.admins.findOneBy({ id: adminId });
    if (!admin) throw new NotFoundException('Admin not found');

    if (admin.emailOtpExpiresAt) {
      const sentAt = admin.emailOtpExpiresAt.getTime() - EMAIL_OTP_TTL_MS;
      if (Date.now() - sentAt < EMAIL_OTP_COOLDOWN_MS) {
        throw new HttpException('Please wait before requesting another code', HttpStatus.TOO_MANY_REQUESTS);
      }
    }

    const otp = randomInt(100000, 1000000).toString();
    admin.emailOtpCodeHash = await bcrypt.hash(otp, 10);
    admin.emailOtpExpiresAt = new Date(Date.now() + EMAIL_OTP_TTL_MS);
    await this.admins.save(admin);

    await this.email.sendPlatformMfaOtpEmail(admin.email, otp);

    return { success: true, expires_in: 600 };
  }

  async verifyEmailOtp(adminId: string, code: string) {
    const admin = await this.admins.findOneBy({ id: adminId });
    if (!admin) throw new NotFoundException('Admin not found');
    if (!admin.emailOtpCodeHash || !admin.emailOtpExpiresAt || admin.emailOtpExpiresAt < new Date()) {
      throw new UnauthorizedException('Code expired');
    }

    const valid = await bcrypt.compare(code, admin.emailOtpCodeHash);
    if (!valid) throw new UnauthorizedException('Invalid code');

    admin.emailOtpCodeHash = undefined as unknown as string;
    admin.emailOtpExpiresAt = undefined as unknown as Date;
    await this.admins.save(admin);

    return { success: true };
  }

  async verifyMfaLogin(tempToken: string, code: string, method: 'totp' | 'email' | 'backup', ipAddress?: string, userAgent?: string) {
    let payload: { sub: string; purpose: string };
    try {
      payload = await this.jwt.verifyAsync<{ sub: string; purpose: string }>(tempToken, {
        algorithms: ['HS256'],
        secret: this.config.get<string>('platformAdmin.jwtSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired temp token');
    }

    if (payload.purpose !== '2fa-pending') throw new UnauthorizedException('Invalid token purpose');

    const admin = await this.admins.findOne({ where: { id: payload.sub, status: PlatformAdminStatus.Active } });
    if (!admin) throw new UnauthorizedException('Admin not found');

    if (method === 'totp') {
      if (!admin.twoFactorSecret) throw new UnauthorizedException('TOTP not configured');
      const secret = this.decryptSecret(admin.twoFactorSecret);
      const { valid } = otplib.verifySync({ token: code, secret });
      if (!valid) throw new UnauthorizedException('Invalid code');
    } else if (method === 'email') {
      await this.verifyEmailOtp(admin.id, code);
    } else if (method === 'backup') {
      if (!admin.backupCodes?.length) throw new UnauthorizedException('No backup codes available');
      let matchIdx = -1;
      for (let i = 0; i < admin.backupCodes.length; i++) {
        if (await bcrypt.compare(code, admin.backupCodes[i])) {
          matchIdx = i;
          break;
        }
      }
      if (matchIdx === -1) throw new UnauthorizedException('Invalid backup code');
      admin.backupCodes = admin.backupCodes.filter((_, i) => i !== matchIdx);
      await this.admins.save(admin);
    }

    admin.failedLoginAttempts = 0;
    admin.lockedUntil = undefined as unknown as Date;
    admin.lastLoginAt = new Date();
    admin.lastLoginIp = ipAddress ?? (undefined as unknown as string);
    await this.admins.save(admin);

    await this.logActivity(admin, 'LOGIN_MFA_VERIFIED', ipAddress, userAgent);

    const accessToken = await this.signAccessToken(admin);
    const refreshToken = await this.refreshTokens.issue(admin.id, undefined, ipAddress, userAgent);

    return { accessToken, refreshToken, admin: this.toShape(admin) };
  }

  private async signTempToken(adminId: string): Promise<string> {
    return this.jwt.signAsync(
      { sub: adminId, purpose: '2fa-pending' },
      {
        algorithm: 'HS256',
        secret: this.config.get<string>('platformAdmin.jwtSecret'),
        expiresIn: '5m',
      },
    );
  }

  private async signAccessToken(admin: PlatformAdmin): Promise<string> {
    const options: JwtSignOptions = {
      algorithm: 'HS256',
      secret: this.config.get<string>('platformAdmin.jwtSecret'),
      expiresIn: this.config.get<string>('platformAdmin.jwtExpiresIn') as JwtSignOptions['expiresIn'],
    };
    return this.jwt.signAsync(
      { sub: admin.id, platform_role: admin.platformRole, email: admin.email },
      options,
    );
  }

  private async createAlert(data: {
    type: string;
    severity: AlertSeverity;
    message: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
    relatedEntityLabel?: string;
  }) {
    try {
      await this.alertsService.create(data);
    } catch {
      // non-critical — do not fail the main operation
    }
  }

  private async logActivity(admin: PlatformAdmin, action: string, ipAddress?: string, userAgent?: string) {
    await this.activityLogs.save(
      this.activityLogs.create({
        adminId: admin.id,
        adminEmail: admin.email,
        action,
        ipAddress,
        userAgent,
      }),
    );
  }

  private toShape(admin: PlatformAdmin) {
    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      platformRole: admin.platformRole,
      status: admin.status,
      lastLoginAt: admin.lastLoginAt,
      twoFactorEnabled: admin.twoFactorEnabled,
      mfaMethod: admin.mfaMethod,
      createdAt: admin.createdAt,
    };
  }

  private encryptSecret(plaintext: string): string {
    const key = Buffer.from(this.config.get<string>('app.twoFactorEncryptionKey')!, 'hex');
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
  }

  private decryptSecret(ciphertext: string): string {
    const key = Buffer.from(this.config.get<string>('app.twoFactorEncryptionKey')!, 'hex');
    const buf = Buffer.from(ciphertext, 'base64');
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const encrypted = buf.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  }
}
