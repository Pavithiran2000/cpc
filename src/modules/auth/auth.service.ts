import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { PortalUser, Tenant } from '../../database/entities';
import { AuditService } from '../audit/audit.service';
import { RefreshTokenService } from './refresh-token.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(PortalUser) private readonly users: Repository<PortalUser>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly refreshTokens: RefreshTokenService,
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

  async refresh(rawRefreshToken: string, userId: string, tenantId: string, ipAddress?: string, userAgent?: string) {
    const user = await this.users.findOne({ where: { id: userId, tenantId, status: 'ACTIVE' } });
    if (!user) throw new UnauthorizedException('User not found');
    const tenant = await this.tenants.findOne({ where: { id: tenantId, status: 'ACTIVE' } });
    if (!tenant) throw new UnauthorizedException('Tenant not found');

    const newRefreshToken = await this.refreshTokens.rotateRefreshToken(rawRefreshToken, userId, tenantId);
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
}
