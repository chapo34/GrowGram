// ESM-kompatibel: jsonwebtoken v9 als Default importieren
import jwt from "jsonwebtoken";
import type { JwtPayload, Secret, SignOptions } from "jsonwebtoken";

function requireSecret(): Secret {
  const isEmu = !!process.env.FUNCTIONS_EMULATOR;
  const isProd = process.env.NODE_ENV === "production";

  // Bevorzugt: echtes Secret aus ENV (Emulator: .env, Prod: Secret Manager via onRequest.secrets)
  const fromEnv = process.env.JWT_SECRET;

  // Optionaler Dev-Fallback nur im Emulator und nicht in Produktion
  const fallback = !isProd && isEmu ? "dev-secret" : "";

  const secret = (fromEnv && fromEnv.trim()) || fallback;
  if (!secret) {
    throw new Error(
      "Missing JWT_SECRET. Set locally in backend/nexus/.env and in production via:\n" +
      "  firebase functions:secrets:set JWT_SECRET"
    );
  }
  return secret as Secret;
}

export type AccessClaims = JwtPayload & {
  sub?: string;
  userId?: string;
  email?: string;
};

// In v9: expiresIn ist number | StringValue ("1d", "12h", …)
type Expires = SignOptions["expiresIn"];
const DEFAULT_EXPIRES: Expires = "1d";

function toExpires(v: unknown): Expires | undefined {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim()) return v as Expires;
  return undefined;
}

export function signAccessToken(
  payload: AccessClaims,
  expiresOrOpts?: string | number | Partial<SignOptions>
): string {
  const secret: Secret = requireSecret();
  const opts: SignOptions = {};

  // ENV-Default
  const envExp = toExpires(process.env.JWT_EXPIRES);
  if (envExp !== undefined) opts.expiresIn = envExp;

  // Pro-Call Override
  if (typeof expiresOrOpts === "string" || typeof expiresOrOpts === "number") {
    const exp = toExpires(expiresOrOpts);
    if (exp !== undefined) opts.expiresIn = exp;
  } else if (expiresOrOpts && typeof expiresOrOpts === "object" && "expiresIn" in expiresOrOpts) {
    const exp = toExpires((expiresOrOpts as Partial<SignOptions>).expiresIn as unknown);
    if (exp !== undefined) opts.expiresIn = exp;
  }

  if (opts.expiresIn === undefined) opts.expiresIn = DEFAULT_EXPIRES;

  // Default-Import benutzen; TS-Adapter wegen Types
  return (jwt as any).sign(payload, secret, opts);
}

// Legacy-Alias
export const signJwt = signAccessToken;

export function verifyAccessToken<T extends AccessClaims = AccessClaims>(token: string): T {
  const secret: Secret = requireSecret();
  return (jwt as any).verify(token, secret) as T;
}