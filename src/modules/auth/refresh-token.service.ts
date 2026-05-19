import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
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

  async issueRefreshToken(userId: string, tenantId: string): Promise<string> {
    const raw = crypto.randomBytes(64).toString('hex');
    const hash = await bcrypt.hash(raw, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.REFRESH_TOKEN_TTL_DAYS);
    await this.tokens.save(
      this.tokens.create({ userId, tenantId, tokenHash: hash, expiresAt }),
    );
    return raw;
  }

  async rotateRefreshToken(
    rawToken: string,
    userId: string,
    tenantId: string,
  ): Promise<string> {
    const validToken = await this.findValid(rawToken, userId, tenantId);
    validToken.revokedAt = new Date();
    await this.tokens.save(validToken);
    return this.issueRefreshToken(userId, tenantId);
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.tokens
      .createQueryBuilder()
      .update()
      .set({ revokedAt: new Date() })
      .where('user_id = :userId AND revoked_at IS NULL', { userId })
      .execute();
  }

  async findValid(
    rawToken: string,
    userId: string,
    tenantId: string,
  ): Promise<PortalUserRefreshToken> {
    const candidates = await this.tokens.find({
      where: { userId, tenantId },
      order: { createdAt: 'DESC' },
      take: 20,
    });
    for (const candidate of candidates) {
      if (candidate.revokedAt) continue;
      if (candidate.expiresAt < new Date()) continue;
      const match = await bcrypt.compare(rawToken, candidate.tokenHash);
      if (match) return candidate;
    }
    throw new UnauthorizedException('Invalid or expired refresh token');
  }
}
