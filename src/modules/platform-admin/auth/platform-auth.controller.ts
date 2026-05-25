import { Body, Controller, Get, HttpCode, HttpStatus, Ip, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentPlatformAdmin, PlatformAdminUser } from './decorators/current-platform-admin.decorator';
import { PlatformForgotPasswordDto } from './dto/platform-forgot-password.dto';
import { PlatformLoginDto } from './dto/platform-login.dto';
import { PlatformMfaDisableDto } from './dto/platform-mfa-disable.dto';
import { PlatformMfaEnableDto } from './dto/platform-mfa-enable.dto';
import { PlatformMfaVerifyEmailOtpDto } from './dto/platform-mfa-verify-email-otp.dto';
import { PlatformMfaVerifyLoginDto } from './dto/platform-mfa-verify-login.dto';
import { PlatformResetPasswordDto } from './dto/platform-reset-password.dto';
import { PlatformJwtGuard } from './guards/platform-jwt.guard';
import { PlatformAuthService } from './platform-auth.service';

const ACCESS_COOKIE = 'platform_admin_token';
const REFRESH_COOKIE = 'platform_admin_refresh_token';

@Public()
@Controller('platform/auth')
export class PlatformAuthController {
  constructor(
    private readonly auth: PlatformAuthService,
    private readonly config: ConfigService,
  ) {}

  private get cookieOptions() {
    const isProd = this.config.get<string>('app.nodeEnv') === 'production';
    const raw = this.config.get<string>('app.cookieDomain');
    const domain = raw === 'localhost' ? undefined : raw;
    return { httpOnly: true, secure: isProd, sameSite: 'lax' as const, path: '/', domain };
  }

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    const opts = this.cookieOptions;
    res.cookie(ACCESS_COOKIE, accessToken, { ...opts, maxAge: 15 * 60 * 1000 });
    res.cookie(REFRESH_COOKIE, refreshToken, { ...opts, maxAge: 7 * 24 * 60 * 60 * 1000 });
  }

  @Throttle({ default: { ttl: 900000, limit: 5 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: PlatformLoginDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
    @Ip() ip: string,
  ) {
    const result = await this.auth.login(dto, ip, req.headers['user-agent']);
    if ('requires_mfa' in result) {
      return { requires_mfa: result.requires_mfa, temp_token: result.temp_token, mfa_method: result.mfa_method };
    }
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return { admin: result.admin };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
  ) {
    const rawToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!rawToken) throw new UnauthorizedException('Refresh token missing');
    const result = await this.auth.refresh(rawToken, ip, req.headers['user-agent']);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return { admin: result.admin };
  }

  @UseGuards(PlatformJwtGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentPlatformAdmin() admin: PlatformAdminUser,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
    @Ip() ip: string,
  ) {
    await this.auth.logout(admin.id, ip, req.headers['user-agent']);
    res.clearCookie(ACCESS_COOKIE, { path: '/' });
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
    return { ok: true };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: PlatformForgotPasswordDto) {
    await this.auth.forgotPassword(dto.email);
    return { message: 'If that email exists you will receive a reset link' };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: PlatformResetPasswordDto) {
    await this.auth.resetPassword(dto.token, dto.new_password, dto.confirm_password);
    return { message: 'Password updated successfully' };
  }

  @UseGuards(PlatformJwtGuard)
  @Get('me')
  async me(@CurrentPlatformAdmin() admin: PlatformAdminUser) {
    const data = await this.auth.getMe(admin.id);
    return { admin: data };
  }

  @UseGuards(PlatformJwtGuard)
  @Post('mfa/generate')
  @HttpCode(HttpStatus.OK)
  mfaGenerate(@CurrentPlatformAdmin() admin: PlatformAdminUser) {
    return this.auth.generateTotpSetup(admin.id);
  }

  @UseGuards(PlatformJwtGuard)
  @Post('mfa/enable')
  @HttpCode(HttpStatus.OK)
  mfaEnable(@CurrentPlatformAdmin() admin: PlatformAdminUser, @Body() dto: PlatformMfaEnableDto) {
    return this.auth.enableTotp(admin.id, dto.totp_code);
  }

  @UseGuards(PlatformJwtGuard)
  @Post('mfa/disable')
  @HttpCode(HttpStatus.OK)
  mfaDisable(@CurrentPlatformAdmin() admin: PlatformAdminUser, @Body() dto: PlatformMfaDisableDto) {
    return this.auth.disableMfa(admin.id, dto.code, dto.password);
  }

  @UseGuards(PlatformJwtGuard)
  @Post('mfa/send-email-otp')
  @HttpCode(HttpStatus.OK)
  mfaSendEmailOtp(@CurrentPlatformAdmin() admin: PlatformAdminUser) {
    return this.auth.sendEmailOtp(admin.id);
  }

  @UseGuards(PlatformJwtGuard)
  @Post('mfa/verify-email-otp')
  @HttpCode(HttpStatus.OK)
  mfaVerifyEmailOtp(@CurrentPlatformAdmin() admin: PlatformAdminUser, @Body() dto: PlatformMfaVerifyEmailOtpDto) {
    return this.auth.verifyEmailOtp(admin.id, dto.code);
  }

  @Post('mfa/verify-login')
  @HttpCode(HttpStatus.OK)
  async mfaVerifyLogin(
    @Body() dto: PlatformMfaVerifyLoginDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
    @Ip() ip: string,
  ) {
    const result = await this.auth.verifyMfaLogin(dto.temp_token, dto.code, dto.method, ip, req.headers['user-agent']);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return { admin: result.admin };
  }
}
