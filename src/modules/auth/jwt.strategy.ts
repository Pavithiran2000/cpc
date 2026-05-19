import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { PortalRole } from '../../common/enums/portal-role.enum';

interface JwtPayload {
  sub: string;
  tenant_id: string;
  portal_role: PortalRole;
  email: string;
}

function fromCookie(request: Request): string | null {
  return request?.cookies?.access_token ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const publicKey = config.get<string>('jwt.publicKey');
    if (!publicKey) {
      throw new Error('JWT_PUBLIC_KEY_BASE64 or JWT_PUBLIC_KEY is required');
    }
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([fromCookie, ExtractJwt.fromAuthHeaderAsBearerToken()]),
      secretOrKey: publicKey,
      algorithms: ['RS256'],
      issuer: config.get<string>('jwt.issuer'),
      audience: config.get<string>('jwt.audience'),
    });
  }

  validate(payload: JwtPayload) {
    if (!payload.sub || !payload.tenant_id || !payload.portal_role) {
      throw new UnauthorizedException('Invalid token payload');
    }
    return {
      id: payload.sub,
      tenantId: payload.tenant_id,
      portalRole: payload.portal_role,
      email: payload.email,
    };
  }
}
