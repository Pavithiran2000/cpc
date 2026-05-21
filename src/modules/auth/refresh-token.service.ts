import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';
import { PortalUserRefreshToken } from '../../database/entities';

@Injectable()
export class RefreshTokenService {
  private readonly REFRESH_TOKEN_TTL_DAYS = 30;

  constructor(
    @InjectRepository(PortalUserRefreshToken)
    private readonly tokens: Repository<PortalUserRefreshToken>,
  ) {}

  async issueRefreshToken(userId: string, tenantId: string, familyId: string = crypto.randomUUID()): Promise<string> {
    const raw = crypto.randomBytes(64).toString('hex');
    const hash = this.hash(raw);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.REFRESH_TOKEN_TTL_DAYS);
    await this.tokens.save(
      this.tokens.create({ userId, tenantId, tokenHash: hash, familyId, expiresAt }),
    );
    return raw;
  }

  async rotateRefreshToken(rawToken: string): Promise<{ refreshToken: string; record: PortalUserRefreshToken }> {
    const validToken = await this.findValid(rawToken);
    validToken.revokedAt = new Date();
    await this.tokens.save(validToken);
    const refreshToken = await this.issueRefreshToken(validToken.userId, validToken.tenantId, validToken.familyId);
    return { refreshToken, record: validToken };
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.tokens
      .createQueryBuilder()
      .update()
      .set({ revokedAt: new Date() })
      .where('user_id = :userId AND revoked_at IS NULL', { userId })
      .execute();
  }

  async findValid(rawToken: string): Promise<PortalUserRefreshToken> {
    const tokenHash = this.hash(rawToken);
    const candidate = await this.tokens.findOne({ where: { tokenHash } });
    if (!candidate) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    if (candidate.revokedAt) {
      await this.revokeFamily(candidate.familyId);
      throw new UnauthorizedException('Refresh token replay detected');
    }
    if (candidate.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
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

  private hash(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }
}
