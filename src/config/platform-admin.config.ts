export const platformAdminConfig = () => ({
  jwtSecret: process.env.PLATFORM_ADMIN_JWT_SECRET ?? '',
  jwtExpiresIn: process.env.PLATFORM_ADMIN_JWT_EXPIRES_IN ?? '15m',
  refreshExpiresDays: 7,
});
