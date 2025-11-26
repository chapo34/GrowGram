// src/services/auth/login.service.ts
import { admin } from "../../config/firebase.js";
import { signAccessToken } from "./jwt.service.js";

/** Mini-Typ für die IdentityToolkit-Antwort (damit wir nicht von fremden Response-Typen abhängen) */
type IGKTResponse = {
  ok: boolean;
  status: number;
  json: <T = unknown>() => Promise<T>;
};

// 🔁 BASE je nach Emulator
function igktBase(): string {
  const emu = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if (emu && emu.trim()) return `http://${emu}/identitytoolkit.googleapis.com/v1`;
  return "https://identitytoolkit.googleapis.com/v1";
}

function requireWebApiKey(): string {
  const key =
    process.env.WEB_API_KEY ||
    process.env.FIREBASE_WEB_API_KEY ||
    process.env.FIREBASE_API_KEY;

  if (!key) {
    if (process.env.FIREBASE_AUTH_EMULATOR_HOST) return "demo"; // Emulator: egal
    throw new Error("WEB_API_KEY fehlt. Setze WEB_API_KEY=AIza... (oder Emulator nutzen).");
  }
  return key.trim();
}

type SignInResp = {
  idToken: string;
  refreshToken: string;
  expiresIn: string;
  localId: string;
  email: string;
  registered: boolean;
};

type FirebaseErrorJson = {
  error?: { code?: number; message?: string; errors?: Array<{ message?: string }> };
} | null;

class LoginError extends Error {
  status = 401 as const;
  code = "auth_failed" as const;
  constructor(msg = "invalid_credentials") { super(msg); }
}

function mapFirebaseError(raw?: string): string {
  switch (raw) {
    case "EMAIL_NOT_FOUND": return "email_not_found";
    case "INVALID_PASSWORD": return "invalid_password";
    case "USER_DISABLED": return "user_disabled";
    case "TOO_MANY_ATTEMPTS_TRY_LATER": return "too_many_attempts";
    default: return raw?.toLowerCase?.() || "auth_failed";
  }
}

export async function loginWithPassword(email: string, password: string) {
  const base = igktBase();
  const key  = requireWebApiKey();

  // ⬇️ Explizit auf ein eigenes Response-Interface casten
  const resp = (await fetch(
    `${base}/accounts:signInWithPassword?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  )) as unknown as IGKTResponse;

  if (!resp.ok) {
    let reason = `HTTP_${resp.status}`;
    try {
      const j = await resp.json<FirebaseErrorJson>();
      reason = mapFirebaseError(j?.error?.message) || reason;
    } catch { /* noop */ }
    throw new LoginError(reason);
  }

  const data = await resp.json<SignInResp>();

  const uid = data.localId;
  const user = await admin.auth().getUser(uid).catch(() => null);

  const accessToken = signAccessToken({
    sub: uid,
    userId: uid,
    email: data.email,
    role: (user?.customClaims as any)?.role || "user",
  });

  const expiresSeconds = Number(data.expiresIn || "3600") || 3600;

  return {
    uid,
    email: data.email,
    accessToken,
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    expiresIn: expiresSeconds,
    userRecord: user || undefined,
  };
}

export async function revokeAllSessions(uid: string) {
  await admin.auth().revokeRefreshTokens(uid);
}