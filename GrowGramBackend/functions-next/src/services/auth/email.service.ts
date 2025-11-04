// src/services/auth/email.service.ts
import sg from '@sendgrid/mail';

const SENDGRID_KEY = process.env.SENDGRID_API_KEY || '';
const FROM_EMAIL = process.env.EMAIL_FROM || 'no-reply@growgram-app.com';
const BRAND = 'GrowGram';

if (SENDGRID_KEY) {
  sg.setApiKey(SENDGRID_KEY);
}

export async function sendVerificationEmail(params: {
  to: string;
  firstName?: string;
  verificationUrl: string;
  unsubscribeUrl?: string;
}) {
  const { to, firstName = 'there', verificationUrl, unsubscribeUrl } = params;

  const html = `
    <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif">
      <h2>${BRAND} – E-Mail bestätigen</h2>
      <p>Hi ${firstName},</p>
      <p>bitte bestätige deine E-Mail-Adresse:</p>
      <p><a href="${verificationUrl}" style="background:#4CAF50;color:#0c1a10;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">E-Mail verifizieren</a></p>
      <p>Sollte der Button nicht funktionieren, öffne diesen Link:<br/>${verificationUrl}</p>
      ${unsubscribeUrl ? `<p style="font-size:12px;opacity:.7">Abmelden: <a href="${unsubscribeUrl}">${unsubscribeUrl}</a></p>` : ''}
    </div>
  `;

  if (!SENDGRID_KEY) {
    console.log('[email] (dry) verify →', { to, verificationUrl });
    return { ok: true, dryRun: true };
  }

  await sg.send({ to, from: FROM_EMAIL, subject: `${BRAND}: E-Mail bestätigen`, html });
  return { ok: true };
}