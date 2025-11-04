import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// jsonwebtoken@9: strengeres Typing für expiresIn -> sauber mappen
function toExpiresIn(v: string | number | undefined): SignOptions['expiresIn'] {
  return typeof v === 'number' ? v : (v as unknown as SignOptions['expiresIn']);
}

export type AccessClaims = JwtPayload & {
  sub?: string;
  userId?: string;
  id?: string;
  email?: string;
  role?: string;
};

export function signAccessToken(
  claims: AccessClaims,
  expiresIn: string | number = '1d'
): string {
  const options: SignOptions = {
    algorithm: 'HS256',
    expiresIn: toExpiresIn(expiresIn),
  };
  return jwt.sign(claims, JWT_SECRET, options);
}

export function verifyAccessToken(token: string): AccessClaims {
  return jwt.verify(token, JWT_SECRET) as AccessClaims;
}