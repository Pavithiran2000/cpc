import { Body, Controller, Get, Ip, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RequestUser } from '../../common/types/request-user.type';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

const REFRESH_COOKIE = 'refresh_token';
const ACCESS_COOKIE = 'access_token';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
    @Req() request: Request,
    @Ip() ip: string,
  ) {
    const result = await this.auth.login(dto, ip, request.headers['user-agent']);
    const isProd = this.config.get<string>('app.nodeEnv') === 'production';
    const cookieDomain = this.config.get<string>('app.cookieDomain') === 'localhost' ? undefined : this.config.get<string>('app.cookieDomain');
    const baseOptions = { httpOnly: true, secure: isProd, sameSite: 'lax' as const, path: '/', domain: cookieDomain };
    response.cookie(ACCESS_COOKIE, result.accessToken, { ...baseOptions, maxAge: 8 * 60 * 60 * 1000 });
    response.cookie(REFRESH_COOKIE, result.refreshToken, { ...baseOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
    return { user: result.user };
  }

  @Public()
  @Post('refresh')
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Ip() ip: string) {
    const rawToken = request.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!rawToken) throw new UnauthorizedException('Refresh token missing');
    // Decode token to get userId + tenantId without verifying (the RefreshTokenService verifies by hash)
    const payload = this.decodeRefreshPayload(rawToken, request);
    const result = await this.auth.refresh(rawToken, payload.userId, payload.tenantId, ip, request.headers['user-agent']);
    const isProd = this.config.get<string>('app.nodeEnv') === 'production';
    const cookieDomain = this.config.get<string>('app.cookieDomain') === 'localhost' ? undefined : this.config.get<string>('app.cookieDomain');
    const baseOptions = { httpOnly: true, secure: isProd, sameSite: 'lax' as const, path: '/', domain: cookieDomain };
    response.cookie(ACCESS_COOKIE, result.accessToken, { ...baseOptions, maxAge: 8 * 60 * 60 * 1000 });
    response.cookie(REFRESH_COOKIE, result.refreshToken, { ...baseOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
    return { user: result.user };
  }

  @Post('logout')
  async logout(@CurrentUser() user: RequestUser, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(user.id);
    response.clearCookie(ACCESS_COOKIE, { path: '/' });
    response.clearCookie(REFRESH_COOKIE, { path: '/' });
    return { ok: true };
  }

  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    return { user };
  }

  private decodeRefreshPayload(rawToken: string, request: Request): { userId: string; tenantId: string } {
    // Refresh tokens are opaque random hex — userId/tenantId are in the access_token cookie or header
    // We read the (possibly expired) access token just to extract claims for DB lookup
    const accessToken = request.cookies?.[ACCESS_COOKIE] as string | undefined;
    if (accessToken) {
      try {
        const parts = accessToken.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as { sub?: string; tenant_id?: string };
          if (payload.sub && payload.tenant_id) {
            return { userId: payload.sub, tenantId: payload.tenant_id };
          }
        }
      } catch {
        // fall through
      }
    }
    throw new UnauthorizedException('Cannot identify user from refresh request — access token missing or malformed');
  }
}
