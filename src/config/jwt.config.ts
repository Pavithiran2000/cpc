function decodeKey(raw?: string, encoded?: string): string {
  if (encoded) {
    return Buffer.from(encoded, 'base64').toString('utf8');
  }
  return (raw ?? '').replace(/\\n/g, '\n');
}

export const jwtConfig = () => ({
  issuer: process.env.JWT_ISSUER ?? 'cpc-filling-station',
  audience: process.env.JWT_AUDIENCE ?? 'cpc-portal',
  expiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  privateKey: decodeKey(process.env.JWT_PRIVATE_KEY, process.env.JWT_PRIVATE_KEY_BASE64),
  publicKey: decodeKey(process.env.JWT_PUBLIC_KEY, process.env.JWT_PUBLIC_KEY_BASE64),
});
