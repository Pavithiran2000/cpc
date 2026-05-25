import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { PlatformRole } from '../../../../database/entities';

interface PlatformJwtPayload {
  sub: string;
  platform_role: PlatformRole;
  email: string;
}

@Injectable()
export class PlatformJwtStrategy extends PassportStrategy(Strategy, 'platform-jwt') {
  constructor(config: ConfigService) {
    const secret = config.get<string>('platformAdmin.jwtSecret');
    if (!secret) throw new Error('PLATFORM_ADMIN_JWT_SECRET is required');
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.platform_access_token ?? null,
      ]),
      secretOrKey: secret,
      algorithms: ['HS256'],
    });
  }

  validate(payload: PlatformJwtPayload) {
    if (!payload.sub || !payload.platform_role) {
      throw new UnauthorizedException('Invalid token payload');
    }
    return { id: payload.sub, platformRole: payload.platform_role, email: payload.email };
  }
}
