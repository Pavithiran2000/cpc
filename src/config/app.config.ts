export const appConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const twoFactorEncryptionKey = process.env.TWO_FACTOR_ENCRYPTION_KEY;

  if (isProduction && !twoFactorEncryptionKey) {
    throw new Error('TWO_FACTOR_ENCRYPTION_KEY is required in production');
  }

  if (twoFactorEncryptionKey && !/^[a-fA-F0-9]{64}$/.test(twoFactorEncryptionKey)) {
    throw new Error('TWO_FACTOR_ENCRYPTION_KEY must be a 64-character hex string');
  }

  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.API_PORT ?? 4000),
    frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000',
    cookieDomain: process.env.COOKIE_DOMAIN,
    twoFactorEncryptionKey: twoFactorEncryptionKey ?? 'a'.repeat(64),
  };
};
