export const appConfig = () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.API_PORT ?? 4000),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000',
  cookieDomain: process.env.COOKIE_DOMAIN,
  // 64-char hex string (32 bytes). Set TWO_FACTOR_ENCRYPTION_KEY in production.
  twoFactorEncryptionKey: process.env.TWO_FACTOR_ENCRYPTION_KEY ?? 'a'.repeat(64),
});
