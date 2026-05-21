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
    const result = await this.auth.refresh(rawToken, ip, request.headers['user-agent']);
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
}
