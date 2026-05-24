import { Body, Controller, Get, Ip, Patch, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RequestUser } from '../../common/types/request-user.type';
import { AuthService } from './auth.service';
import { Activate2faDto } from './dto/activate-2fa.dto';
import { Challenge2faDto } from './dto/challenge-2fa.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Disable2faDto } from './dto/disable-2fa.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterResendDto } from './dto/register-resend.dto';
import { RegisterStartDto } from './dto/register-start.dto';
import { RegisterVerifyDto } from './dto/register-verify.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

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
    if ('requires_2fa' in result) {
      return result;
    }
    const isProd = this.config.get<string>('app.nodeEnv') === 'production';
    const cookieDomain = this.config.get<string>('app.cookieDomain') === 'localhost' ? undefined : this.config.get<string>('app.cookieDomain');
    const baseOptions = { httpOnly: true, secure: isProd, sameSite: 'lax' as const, path: '/', domain: cookieDomain };
    response.cookie(ACCESS_COOKIE, result.accessToken, { ...baseOptions, maxAge: 8 * 60 * 60 * 1000 });
    response.cookie(REFRESH_COOKIE, result.refreshToken, { ...baseOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
    return { user: result.user };
  }

  @Public()
  @Post('register/start')
  startRegistration(@Body() dto: RegisterStartDto) {
    return this.auth.startRegistration(dto);
  }

  @Public()
  @Post('register/verify')
  verifyRegistration(@Body() dto: RegisterVerifyDto) {
    return this.auth.verifyRegistration(dto);
  }

  @Public()
  @Post('register/resend-code')
  resendRegistrationCode(@Body() dto: RegisterResendDto) {
    return this.auth.resendRegistrationCode(dto);
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
  async me(@CurrentUser() user: RequestUser) {
    const profile = await this.auth.getProfile(user.id);
    return { user: profile };
  }

  @Patch('profile')
  async updateProfile(@CurrentUser() user: RequestUser, @Body() dto: UpdateProfileDto) {
    const profile = await this.auth.updateProfile(user.id, user.tenantId, dto);
    return { user: profile };
  }

  @Post('change-password')
  changePassword(@CurrentUser() user: RequestUser, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user.id, user.tenantId, dto);
  }

  @Post('2fa/setup')
  setup2fa(@CurrentUser() user: RequestUser) {
    return this.auth.setup2fa(user.id, user.tenantId);
  }

  @Post('2fa/activate')
  activate2fa(@CurrentUser() user: RequestUser, @Body() dto: Activate2faDto) {
    return this.auth.activate2fa(user.id, user.tenantId, dto);
  }

  @Post('2fa/disable')
  disable2fa(@CurrentUser() user: RequestUser, @Body() dto: Disable2faDto) {
    return this.auth.disable2fa(user.id, user.tenantId, dto);
  }

  @Public()
  @Post('2fa/challenge')
  async challenge2fa(
    @Body() dto: Challenge2faDto,
    @Res({ passthrough: true }) response: Response,
    @Req() request: Request,
    @Ip() ip: string,
  ) {
    const result = await this.auth.challenge2fa(dto, ip, request.headers['user-agent']);
    const isProd = this.config.get<string>('app.nodeEnv') === 'production';
    const cookieDomain = this.config.get<string>('app.cookieDomain') === 'localhost' ? undefined : this.config.get<string>('app.cookieDomain');
    const baseOptions = { httpOnly: true, secure: isProd, sameSite: 'lax' as const, path: '/', domain: cookieDomain };
    response.cookie(ACCESS_COOKIE, result.accessToken, { ...baseOptions, maxAge: 8 * 60 * 60 * 1000 });
    response.cookie(REFRESH_COOKIE, result.refreshToken, { ...baseOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
    return { user: result.user };
  }
}
