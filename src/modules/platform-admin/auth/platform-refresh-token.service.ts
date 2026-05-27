import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';
import { PlatformAdminRefreshToken } from '../../../database/entities';

@Injectable()
export class PlatformRefreshTokenService {
  private readonly TTL_DAYS = 7;

  constructor(
    @InjectRepository(PlatformAdminRefreshToken)
    private readonly tokens: Repository<PlatformAdminRefreshToken>,
  ) {}

  async issue(adminId: string, familyId: string = crypto.randomUUID(), ipAddress?: string, userAgent?: string): Promise<string> {
    const raw = crypto.randomBytes(64).toString('hex');
    const tokenHash = this.hash(raw);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.TTL_DAYS);
    await this.tokens.save(
      this.tokens.create({ adminId, tokenHash, familyId, expiresAt, ipAddress, userAgent }),
    );
    return raw;
  }

  async rotate(rawToken: string, ipAddress?: string, userAgent?: string): Promise<{ refreshToken: string; record: PlatformAdminRefreshToken }> {
    const record = await this.findValid(rawToken);
    record.revokedAt = new Date();
    await this.tokens.save(record);
    const refreshToken = await this.issue(record.adminId, record.familyId, ipAddress, userAgent);
    return { refreshToken, record };
  }

  async findActiveForAdmin(adminId: string): Promise<PlatformAdminRefreshToken[]> {
    return this.tokens
      .createQueryBuilder('t')
      .where('t.admin_id = :adminId AND t.revoked_at IS NULL AND t.expires_at > NOW()', { adminId })
      .orderBy('t.created_at', 'DESC')
      .getMany();
  }

  async revokeOne(tokenId: string, adminId: string): Promise<void> {
    await this.tokens
      .createQueryBuilder()
      .update()
      .set({ revokedAt: new Date() })
      .where('id = :tokenId AND admin_id = :adminId AND revoked_at IS NULL', { tokenId, adminId })
      .execute();
  }

  async revokeAllForAdmin(adminId: string): Promise<void> {
    await this.tokens
      .createQueryBuilder()
      .update()
      .set({ revokedAt: new Date() })
      .where('admin_id = :adminId AND revoked_at IS NULL', { adminId })
      .execute();
  }

  private async findValid(rawToken: string): Promise<PlatformAdminRefreshToken> {
    const tokenHash = this.hash(rawToken);
    const candidate = await this.tokens.findOne({ where: { tokenHash } });
    if (!candidate) throw new UnauthorizedException('Invalid or expired refresh token');
    if (candidate.revokedAt) {
      await this.revokeFamily(candidate.familyId);
      throw new UnauthorizedException('Refresh token replay detected');
    }
    if (candidate.expiresAt < new Date()) throw new UnauthorizedException('Invalid or expired refresh token');
    return candidate;
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.tokens
      .createQueryBuilder()
      .update()
      .set({ revokedAt: new Date() })
      .where('family_id = :familyId AND revoked_at IS NULL', { familyId })
      .execute();
  }

  private hash(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }
}
