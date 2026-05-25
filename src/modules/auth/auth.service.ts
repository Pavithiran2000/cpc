import { BadRequestException, ConflictException, HttpException, HttpStatus, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import * as otplib from 'otplib';
import * as QRCode from 'qrcode';
import { Activate2faDto } from './dto/activate-2fa.dto';
import { Challenge2faDto } from './dto/challenge-2fa.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Disable2faDto } from './dto/disable-2fa.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { GeoCity, GeoDistrict, GeoProvince, PortalUser, Tenant, TenantRegistrationAttempt } from '../../database/entities';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../email/email.service';
import { TenantsService } from '../tenants/tenants.service';
import { RefreshTokenService } from './refresh-token.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterResendDto } from './dto/register-resend.dto';
import { RegisterStartDto } from './dto/register-start.dto';
import { RegisterVerifyDto } from './dto/register-verify.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const VERIFICATION_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(PortalUser) private readonly users: Repository<PortalUser>,
    @InjectRepository(TenantRegistrationAttempt) private readonly registrations: Repository<TenantRegistrationAttempt>,
    @InjectRepository(GeoProvince) private readonly provinces: Repository<GeoProvince>,
    @InjectRepository(GeoDistrict) private readonly districts: Repository<GeoDistrict>,
    @InjectRepository(GeoCity) private readonly cities: Repository<GeoCity>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly refreshTokens: RefreshTokenService,
    private readonly tenantsService: TenantsService,
    private readonly email: EmailService,
  ) {}

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const tenant = await this.tenants.findOne({
      where: { stationCode: dto.station_code, status: 'ACTIVE' },
    });
    if (!tenant) {
      throw new UnauthorizedException('Invalid station code or credentials');
    }

    const user = await this.users.findOne({
      where: { tenantId: tenant.id, email: dto.email.toLowerCase(), status: 'ACTIVE' },
    });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid station code or credentials');
    }

    if (user.twoFactorEnabled) {
      const challengeToken = await this.jwt.signAsync(
        { sub: user.id, tenant_id: tenant.id, type: '2fa_challenge' },
        {
          algorithm: 'RS256',
          privateKey: this.config.get<string>('jwt.privateKey'),
          issuer: this.config.get<string>('jwt.issuer'),
          audience: this.config.get<string>('jwt.audience'),
          expiresIn: '5m',
        },
      );
      return { requires_2fa: true, challenge_token: challengeToken };
    }

    user.lastLoginAt = new Date();
    await this.users.save(user);

    await this.audit.record({
      tenantId: tenant.id,
      actorUserId: user.id,
      moduleName: 'auth',
      action: 'LOGIN',
      ipAddress,
      userAgent,
    });

    const accessToken = await this.signAccessToken(user, tenant.id);
    const refreshToken = await this.refreshTokens.issueRefreshToken(user.id, tenant.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        tenantId: tenant.id,
        email: user.email,
        name: user.name,
        portalRole: user.portalRole,
        stationCode: tenant.stationCode,
        stationName: tenant.stationName,
      },
    };
  }

  async refresh(rawRefreshToken: string, ipAddress?: string, userAgent?: string) {
    const { refreshToken: newRefreshToken, record } = await this.refreshTokens.rotateRefreshToken(rawRefreshToken);
    const { userId, tenantId } = record;
    const user = await this.users.findOne({ where: { id: userId, tenantId, status: 'ACTIVE' } });
    if (!user) throw new UnauthorizedException('User not found');
    const tenant = await this.tenants.findOne({ where: { id: tenantId, status: 'ACTIVE' } });
    if (!tenant) throw new UnauthorizedException('Tenant not found');

    const accessToken = await this.signAccessToken(user, tenantId);

    await this.audit.record({
      tenantId,
      actorUserId: userId,
      moduleName: 'auth',
      action: 'TOKEN_REFRESH',
      ipAddress,
      userAgent,
    });

    return { accessToken, refreshToken: newRefreshToken, user: { id: user.id, tenantId, email: user.email, name: user.name, portalRole: user.portalRole, stationCode: tenant.stationCode, stationName: tenant.stationName } };
  }

  async logout(userId: string) {
    await this.refreshTokens.revokeAllForUser(userId);
  }

  async getProfile(userId: string) {
    const user = await this.users.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');
    return this.toProfileShape(user);
  }

  async updateProfile(userId: string, tenantId: string, dto: UpdateProfileDto) {
    const user = await this.users.findOne({ where: { id: userId, tenantId } });
    if (!user) throw new NotFoundException('User not found');
    if (dto.name !== undefined) user.name = dto.name;
    if (dto.phone !== undefined) user.phone = dto.phone;
    const saved = await this.users.save(user);
    return this.toProfileShape(saved);
  }

  async changePassword(userId: string, tenantId: string, dto: ChangePasswordDto) {
    const user = await this.users.findOne({ where: { id: userId, tenantId } });
    if (!user) throw new NotFoundException('User not found');
    const valid = await bcrypt.compare(dto.current_password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');
    user.passwordHash = await bcrypt.hash(dto.new_password, 12);
    await this.users.save(user);
    await this.refreshTokens.revokeAllForUser(user.id);
    return { ok: true };
  }

  private toProfileShape(user: import('../../database/entities').PortalUser) {
    return {
      id: user.id,
      tenant_id: user.tenantId,
      email: user.email,
      name: user.name,
      phone: user.phone,
      portal_role: user.portalRole,
      last_login_at: user.lastLoginAt,
      two_factor_enabled: user.twoFactorEnabled,
    };
  }

  async startRegistration(dto: RegisterStartDto) {
    const normalized = await this.normalizeAndValidateRegistration(dto);
    await this.ensureStationCodeAvailable(normalized.stationCode);

    const now = new Date();
    const existing = await this.registrations.findOne({
      where: { stationCode: normalized.stationCode, status: 'PENDING' },
      order: { createdAt: 'DESC' },
    });

    if (existing && existing.expiresAt > now) {
      throw new ConflictException({
        message: 'A registration for this station code is already pending. Continue verification or resend the code.',
        registration_id: existing.id,
        email: maskEmail(existing.ownerEmail),
      });
    }

    if (existing) {
      existing.status = 'EXPIRED';
      await this.registrations.save(existing);
    }

    const code = generateVerificationCode();
    const registration = await this.registrations.save(
      this.registrations.create({
        stationCode: normalized.stationCode,
        stationName: normalized.stationName,
        ownerName: normalized.ownerName,
        phone: normalized.phone,
        country: normalized.country,
        addressLine1: normalized.addressLine1,
        addressLine2: normalized.addressLine2,
        provinceId: normalized.province.id,
        districtId: normalized.district.id,
        geoCityId: normalized.city?.id,
        customCityName: normalized.customCityName,
        postalCode: normalized.postalCode,
        latitude: normalized.city?.latitude,
        longitude: normalized.city?.longitude,
        ownerEmail: normalized.ownerEmail,
        ownerPasswordHash: await bcrypt.hash(dto.password, 12),
        verificationCodeHash: await bcrypt.hash(code, 12),
        expiresAt: new Date(now.getTime() + VERIFICATION_TTL_MS),
        lastSentAt: now,
      }),
    );

    await this.email.sendVerificationCode({
      to: normalized.ownerEmail,
      code,
      stationName: normalized.stationName,
    });

    return {
      registration_id: registration.id,
      email: maskEmail(normalized.ownerEmail),
      expires_at: registration.expiresAt,
      resend_after_seconds: Math.ceil(RESEND_COOLDOWN_MS / 1000),
    };
  }

  async verifyRegistration(dto: RegisterVerifyDto) {
    const registration = await this.registrations.findOne({ where: { id: dto.registration_id } });
    if (!registration) throw new NotFoundException('Registration not found');
    if (registration.status !== 'PENDING') throw new BadRequestException('Registration is not pending');
    if (registration.expiresAt <= new Date()) {
      registration.status = 'EXPIRED';
      await this.registrations.save(registration);
      throw new BadRequestException('Verification code has expired');
    }
    if (registration.attemptCount >= MAX_VERIFY_ATTEMPTS) {
      throw new TooManyRequestsHttpException('Too many verification attempts');
    }

    const valid = await bcrypt.compare(dto.code, registration.verificationCodeHash);
    if (!valid) {
      registration.attemptCount += 1;
      await this.registrations.save(registration);
      throw new UnauthorizedException('Invalid verification code');
    }

    await this.ensureStationCodeAvailable(registration.stationCode);

    const province = await this.provinces.findOneByOrFail({ id: registration.provinceId });
    const district = await this.districts.findOneByOrFail({ id: registration.districtId });
    const city = registration.geoCityId ? await this.cities.findOneByOrFail({ id: registration.geoCityId }) : undefined;
    const cityName = city?.name ?? registration.customCityName!;
    const address = [
      registration.addressLine1,
      registration.addressLine2,
      cityName,
      district.name,
      province.name,
      registration.country,
    ].filter(Boolean).join(', ');

    const tenant = await this.tenantsService.create({
      station_code: registration.stationCode,
      station_name: registration.stationName,
      owner_name: registration.ownerName,
      contact_number: registration.phone,
      address,
      address_line1: registration.addressLine1,
      address_line2: registration.addressLine2,
      city: cityName,
      district: district.name,
      province: province.name,
      postal_code: registration.postalCode,
      country: registration.country,
      latitude: registration.latitude,
      longitude: registration.longitude,
      geo_city_id: registration.geoCityId,
      owner_email: registration.ownerEmail,
      owner_password_hash: registration.ownerPasswordHash,
      custom_city_name: registration.customCityName,
      normalized_custom_city_name: registration.customCityName ? normalizeLookup(registration.customCityName) : undefined,
      province_id: registration.provinceId,
      district_id: registration.districtId,
    });

    registration.status = 'COMPLETED';
    await this.registrations.save(registration);

    return {
      station_code: tenant.stationCode,
      station_name: tenant.stationName,
      owner_email: registration.ownerEmail,
    };
  }

  async resendRegistrationCode(dto: RegisterResendDto) {
    const registration = await this.registrations.findOne({ where: { id: dto.registration_id } });
    if (!registration) throw new NotFoundException('Registration not found');
    if (registration.status !== 'PENDING') throw new BadRequestException('Registration is not pending');
    if (registration.expiresAt <= new Date()) {
      registration.status = 'EXPIRED';
      await this.registrations.save(registration);
      throw new BadRequestException('Registration has expired');
    }

    const elapsed = Date.now() - registration.lastSentAt.getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      throw new TooManyRequestsHttpException(`Please wait ${Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000)} seconds before resending`);
    }

    await this.ensureStationCodeAvailable(registration.stationCode);

    const code = generateVerificationCode();
    registration.verificationCodeHash = await bcrypt.hash(code, 12);
    registration.expiresAt = new Date(Date.now() + VERIFICATION_TTL_MS);
    registration.lastSentAt = new Date();
    registration.attemptCount = 0;
    await this.registrations.save(registration);

    await this.email.sendVerificationCode({
      to: registration.ownerEmail,
      code,
      stationName: registration.stationName,
    });

    return {
      registration_id: registration.id,
      email: maskEmail(registration.ownerEmail),
      expires_at: registration.expiresAt,
      resend_after_seconds: Math.ceil(RESEND_COOLDOWN_MS / 1000),
    };
  }

  private async normalizeAndValidateRegistration(dto: RegisterStartDto) {
    const stationCode = dto.station_code.trim().toUpperCase();
    const stationName = normalizeSpaces(dto.station_name);
    const ownerName = normalizeSpaces(dto.owner_name);
    const country = normalizeSpaces(dto.country || 'Sri Lanka');
    if (country.toLowerCase() !== 'sri lanka') {
      throw new BadRequestException('Only Sri Lanka addresses are supported for registration');
    }

    const phone = normalizePhone(dto.phone);
    if (!/^\+?[0-9]{7,15}$/.test(phone)) {
      throw new BadRequestException('Phone number must contain 7 to 15 digits');
    }

    const province = await this.provinces.findOne({ where: { id: dto.province_id } });
    if (!province) throw new BadRequestException('Province not found');
    const district = await this.districts.findOne({ where: { id: dto.district_id, provinceId: province.id } });
    if (!district) throw new BadRequestException('District does not belong to the selected province');

    let city: GeoCity | undefined;
    let customCityName: string | undefined;
    if (dto.geo_city_id) {
      city = await this.cities.findOne({ where: { id: dto.geo_city_id, districtId: district.id, provinceId: province.id } }) ?? undefined;
      if (!city) throw new BadRequestException('City does not belong to the selected district');
    } else if (dto.custom_city_name) {
      customCityName = normalizeSpaces(dto.custom_city_name);
    } else {
      throw new BadRequestException('City is required');
    }

    return {
      stationCode,
      stationName,
      ownerName,
      phone,
      country: 'Sri Lanka',
      addressLine1: normalizeSpaces(dto.address_line1),
      addressLine2: dto.address_line2 ? normalizeSpaces(dto.address_line2) : undefined,
      province,
      district,
      city,
      customCityName,
      postalCode: dto.postal_code ? normalizeSpaces(dto.postal_code) : city?.postalCode,
      ownerEmail: dto.owner_email.trim().toLowerCase(),
    };
  }

  private async ensureStationCodeAvailable(stationCode: string) {
    const existing = await this.tenants.findOne({ where: { stationCode } });
    if (existing) {
      throw new ConflictException('This station code is already registered. Try another code or sign in.');
    }
  }

  async setup2fa(userId: string, tenantId: string) {
    const user = await this.users.findOne({ where: { id: userId, tenantId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.twoFactorEnabled) throw new BadRequestException('Two-factor authentication is already enabled');

    const secret = otplib.generateSecret();
    user.twoFactorPendingSecret = this.encryptSecret(secret);
    await this.users.save(user);

    const otpauth = otplib.generateURI({ issuer: 'CPC Portal', label: user.email, secret });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

    return { qr_code_url: qrCodeDataUrl, manual_entry_key: secret };
  }

  async activate2fa(userId: string, tenantId: string, dto: Activate2faDto) {
    const user = await this.users.findOne({ where: { id: userId, tenantId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.twoFactorEnabled) throw new BadRequestException('Two-factor authentication is already enabled');
    if (!user.twoFactorPendingSecret) throw new BadRequestException('No pending 2FA setup found. Call setup first.');

    const pendingSecret = this.decryptSecret(user.twoFactorPendingSecret);
    const { valid: isValid } = otplib.verifySync({ token: dto.code, secret: pendingSecret });
    if (!isValid) throw new UnauthorizedException('Invalid verification code');

    user.twoFactorSecret = user.twoFactorPendingSecret;
    user.twoFactorPendingSecret = undefined;
    user.twoFactorEnabled = true;
    await this.users.save(user);

    return { ok: true };
  }

  async disable2fa(userId: string, tenantId: string, dto: Disable2faDto) {
    const user = await this.users.findOne({ where: { id: userId, tenantId } });
    if (!user) throw new NotFoundException('User not found');
    if (!user.twoFactorEnabled) throw new BadRequestException('Two-factor authentication is not enabled');

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) throw new UnauthorizedException('Current password is incorrect');

    const secret = this.decryptSecret(user.twoFactorSecret!);
    const { valid: codeValid } = otplib.verifySync({ token: dto.code, secret });
    if (!codeValid) throw new UnauthorizedException('Invalid authenticator code');

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.twoFactorPendingSecret = undefined;
    await this.users.save(user);

    return { ok: true };
  }

  async challenge2fa(dto: Challenge2faDto, ipAddress?: string, userAgent?: string) {
    let payload: { sub: string; tenant_id: string; type: string };
    try {
      payload = await this.jwt.verifyAsync(dto.challenge_token, {
        algorithms: ['RS256'],
        publicKey: this.config.get<string>('jwt.publicKey'),
        issuer: this.config.get<string>('jwt.issuer'),
        audience: this.config.get<string>('jwt.audience'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired challenge token');
    }

    if (payload.type !== '2fa_challenge') throw new UnauthorizedException('Invalid challenge token type');

    const user = await this.users.findOne({ where: { id: payload.sub, tenantId: payload.tenant_id, status: 'ACTIVE' } });
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new UnauthorizedException('User not found or 2FA not configured');
    }

    const secret = this.decryptSecret(user.twoFactorSecret);
    const { valid: challengeValid } = otplib.verifySync({ token: dto.code, secret });
    if (!challengeValid) throw new UnauthorizedException('Invalid authenticator code');

    const tenant = await this.tenants.findOne({ where: { id: payload.tenant_id, status: 'ACTIVE' } });
    if (!tenant) throw new UnauthorizedException('Tenant not found');

    user.lastLoginAt = new Date();
    await this.users.save(user);

    await this.audit.record({
      tenantId: tenant.id,
      actorUserId: user.id,
      moduleName: 'auth',
      action: 'LOGIN',
      ipAddress,
      userAgent,
    });

    const accessToken = await this.signAccessToken(user, tenant.id);
    const refreshToken = await this.refreshTokens.issueRefreshToken(user.id, tenant.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        tenantId: tenant.id,
        email: user.email,
        name: user.name,
        portalRole: user.portalRole,
        stationCode: tenant.stationCode,
        stationName: tenant.stationName,
      },
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

  private async signAccessToken(user: PortalUser, tenantId: string): Promise<string> {
    const signOptions: JwtSignOptions = {
      algorithm: 'RS256',
      privateKey: this.config.get<string>('jwt.privateKey'),
      issuer: this.config.get<string>('jwt.issuer'),
      audience: this.config.get<string>('jwt.audience'),
      expiresIn: this.config.get<string>('jwt.expiresIn') as JwtSignOptions['expiresIn'],
    };
    return this.jwt.signAsync(
      { sub: user.id, tenant_id: tenantId, portal_role: user.portalRole, email: user.email },
      signOptions,
    );
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ ok: boolean }> {
    const tenant = await this.tenants.findOne({
      where: { stationCode: dto.station_code.toUpperCase(), status: 'ACTIVE' },
    });
    if (!tenant) return { ok: true };

    const user = await this.users.findOne({
      where: { tenantId: tenant.id, email: dto.email.toLowerCase(), status: 'ACTIVE' },
    });
    if (!user) return { ok: true };

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    user.resetPasswordToken = tokenHash;
    user.resetPasswordExpiresAt = expiresAt;
    await this.users.save(user);

    const frontendOrigin = this.config.get<string>('app.frontendOrigin') ?? 'http://localhost:3000';
    const resetUrl = `${frontendOrigin}/reset-password?token=${rawToken}`;

    await this.email.sendPasswordResetEmail({ to: user.email, resetUrl, stationName: tenant.stationName });

    return { ok: true };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ ok: boolean }> {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const user = await this.users.findOne({ where: { resetPasswordToken: tokenHash } });

    if (!user || !user.resetPasswordExpiresAt || user.resetPasswordExpiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset link');
    }

    await this.users.update(user.id, {
      passwordHash: await bcrypt.hash(dto.new_password, 12),
      resetPasswordToken: null,
      resetPasswordExpiresAt: null,
    });

    await this.refreshTokens.revokeAllForUser(user.id);

    return { ok: true };
  }
}

function normalizeSpaces(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeLookup(value: string) {
  return normalizeSpaces(value).toLowerCase();
}

function normalizePhone(value: string) {
  return value.trim().replace(/[\s\-()]/g, '');
}

function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function maskEmail(email: string) {
  const [name, domain] = email.split('@');
  if (!domain) return email;
  const visible = name.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(name.length - 2, 2))}@${domain}`;
}

class TooManyRequestsHttpException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.TOO_MANY_REQUESTS);
  }
}
