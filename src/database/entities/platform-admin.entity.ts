import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PlatformRole {
  SuperAdmin = 'SUPER_ADMIN',
  Admin = 'ADMIN',
  Support = 'SUPPORT',
}

export enum PlatformAdminStatus {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE',
  Suspended = 'SUSPENDED',
}

export enum MfaMethod {
  Totp = 'TOTP',
  Email = 'EMAIL',
  Both = 'BOTH',
}

@Entity('platform_admins')
@Index(['email'], { unique: true })
export class PlatformAdmin {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150, unique: true })
  email: string;

  @Column({ name: 'password_hash', type: 'text' })
  passwordHash: string;

  @Column({ length: 150 })
  name: string;

  @Column({
    name: 'platform_role',
    type: 'varchar',
    length: 30,
    default: PlatformRole.Admin,
  })
  platformRole: PlatformRole;

  @Column({
    type: 'varchar',
    length: 30,
    default: PlatformAdminStatus.Active,
  })
  status: PlatformAdminStatus;

  @Column({ name: 'two_factor_enabled', default: false })
  twoFactorEnabled: boolean;

  @Column({ name: 'two_factor_secret', type: 'text', nullable: true })
  twoFactorSecret?: string;

  @Column({ name: 'two_factor_pending_secret', type: 'text', nullable: true })
  twoFactorPendingSecret?: string;

  @Column({ name: 'mfa_method', type: 'varchar', length: 20, nullable: true })
  mfaMethod?: MfaMethod;

  @Column({ name: 'email_otp_code_hash', type: 'text', nullable: true })
  emailOtpCodeHash?: string;

  @Column({ name: 'email_otp_expires_at', type: 'timestamptz', nullable: true })
  emailOtpExpiresAt?: Date;

  @Column({ name: 'backup_codes', type: 'jsonb', nullable: true })
  backupCodes?: string[];

  @Column({ name: 'reset_password_token', type: 'text', nullable: true })
  resetPasswordToken?: string;

  @Column({ name: 'reset_password_expires_at', type: 'timestamptz', nullable: true })
  resetPasswordExpiresAt?: Date;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt?: Date;

  @Column({ name: 'last_login_ip', length: 100, nullable: true })
  lastLoginIp?: string;

  @Column({ name: 'failed_login_attempts', type: 'int', default: 0 })
  failedLoginAttempts: number;

  @Column({ name: 'locked_until', type: 'timestamptz', nullable: true })
  lockedUntil?: Date;

  @Column({ name: 'invited_by', type: 'uuid', nullable: true })
  invitedBy?: string;

  @Column({ name: 'invite_token_hash', type: 'text', nullable: true })
  inviteTokenHash?: string;

  @Column({ name: 'invite_expires_at', type: 'timestamptz', nullable: true })
  inviteExpiresAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

@Entity('platform_admin_refresh_tokens')
@Index(['adminId'])
@Index(['tokenHash'])
export class PlatformAdminRefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'admin_id', type: 'uuid' })
  adminId: string;

  @ManyToOne(() => PlatformAdmin, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'admin_id' })
  admin?: PlatformAdmin;

  @Column({ name: 'token_hash', type: 'text' })
  tokenHash: string;

  @Column({ name: 'family_id', type: 'uuid' })
  familyId: string;

  @Column({ name: 'ip_address', length: 100, nullable: true })
  ipAddress?: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent?: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

@Entity('platform_activity_logs')
@Index(['adminId'])
@Index(['createdAt'])
@Index(['action'])
@Index(['targetType', 'targetId'])
export class PlatformActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'admin_id', type: 'uuid', nullable: true })
  adminId?: string;

  @ManyToOne(() => PlatformAdmin, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'admin_id' })
  admin?: PlatformAdmin;

  @Column({ name: 'admin_email', length: 150, nullable: true })
  adminEmail?: string;

  @Column({ length: 100 })
  action: string;

  @Column({ name: 'target_type', length: 100, nullable: true })
  targetType?: string;

  @Column({ name: 'target_id', length: 36, nullable: true })
  targetId?: string;

  @Column({ name: 'target_label', length: 255, nullable: true })
  targetLabel?: string;

  @Column({ type: 'jsonb', nullable: true })
  details?: Record<string, unknown>;

  @Column({ name: 'ip_address', length: 100, nullable: true })
  ipAddress?: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
