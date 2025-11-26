// src/services/auth/email.service.ts
import 'dotenv/config';

/** Helpers */
function projectId(): string {
  return (
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.FIREBASE_PROJECT_ID ||
    ''
  );
}
function isEmu(): boolean {
  return !!process.env.FUNCTIONS_EMULATOR || !!process.env.FIRESTORE_EMULATOR_HOST;
}
function region(): string {
  return process.env.REGION || 'europe-west3';
}

/** Baut eine direkte Backend-URL zur Function (Emu/Prod), unabhängig vom Frontend. */
export function buildVerifyUrlFromBackend(token: string): string {
  const pid = projectId();
  const reg = region();
  if (isEmu()) {
    // Functions Emulator
    return `http://127.0.0.1:5001/${pid}/${reg}/apiV1/auth/verify-email?token=${encodeURIComponent(token)}`;
  }
  // Prod
  return `https://${reg}-${pid}.cloudfunctions.net/apiV1/auth/verify-email?token=${encodeURIComponent(token)}`;
}

/** Optional: schöne Frontend-URL (falls Hosting-Redirects korrekt gesetzt sind). */
export function buildVerifyUrlForFrontend(token: string): string | null {
  const base = (process.env.FRONTEND_HOST || process.env.APP_BASEURL || '').replace(/\/$/, '');
  if (!base) return null;
  // Im Frontend-Hosting muss /verify-email → deine apiV1-Funktion redirecten.
  const path = process.env.FRONTEND_VERIFY_PATH || '/verify-email';
  return `${base}${path}?token=${encodeURIComponent(token)}`;
}

type SendResult = { ok: true } | { ok: false; error: string };

/**
 * Sendet eine Verifizierungs-Mail. Akzeptiert optional userId (für Template/Logging).
 */
export async function sendVerificationEmail(params: {
  to: string;
  firstName?: string;
  verificationUrl: string;
  userId?: string;              // <-- hinzugefügt
}): Promise<SendResult> {
  const devMode = process.env.EMAIL_DEV_MODE === '1' || isEmu();

  const KEY =
    process.env.SENDGRID_API_KEY ||
    process.env.SENDGRID_KEY ||
    process.env.SENDGRID ||
    '';
  const TEMPLATE = process.env.SENDGRID_TEMPLATE_VERIFY || '';
  const FROM = process.env.SENDGRID_SENDER || 'GrowGram <no-reply@growgram-app.com>';

  // Dev/Emu oder SendGrid nicht konfiguriert → nicht blockieren
  if (devMode || !KEY || !TEMPLATE) {
    console.log('[email.dev] To:', params.to);
    console.log('[email.dev] Verify URL:', params.verificationUrl);
    if (params.userId) console.log('[email.dev] userId:', params.userId);
    if (!KEY || !TEMPLATE) console.warn('[email] SendGrid not configured – skipping send');
    return { ok: true };
  }

  try {
    const { default: sg } = await import('@sendgrid/mail');
    (sg as any).setApiKey(KEY);

    await (sg as any).send({
      to: params.to,
      from: FROM,
      templateId: TEMPLATE,
      dynamicTemplateData: {
        firstName: params.firstName || 'Friend',
        verificationUrl: params.verificationUrl,
        appName: 'GrowGram',
        ...(params.userId ? { userId: params.userId } : {}),
      },
    });

    return { ok: true };
  } catch (e: any) {
    console.error('[email.sendgrid] failed:', e?.message || e);
    return { ok: false, error: 'email_send_failed' };
  }
}