// src/services/emailService.ts
import sgMail, { MailDataRequired } from '@sendgrid/mail';
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.SENDGRID_API_KEY!;
const FROM_EMAIL = process.env.SENDGRID_SENDER || 'no-reply@growgram-app.com';
const FROM_NAME  = process.env.SENDGRID_SENDER_NAME || 'GrowGram';
const TPL_VERIFY = process.env.SENDGRID_TEMPLATE_VERIFY || 'd-c1256a81a95744d089c73646cf62fe68';
const TPL_RESET  = process.env.SENDGRID_TEMPLATE_RESET!;

sgMail.setApiKey(API_KEY);

async function send(opts: {
  to: string;
  subject?: string;              // optional, falls im Template gesetzt
  templateId: string;
  data: Record<string, unknown>;
  category?: string;
}) {
  const msg: MailDataRequired = {
    to: opts.to,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    templateId: opts.templateId,
    dynamicTemplateData: opts.data,
    // wenn das Template KEIN Subject hat, nutzen wir das hier:
    ...(opts.subject ? { subject: opts.subject } : {}),
    ...(opts.category ? { categories: [opts.category] } : {}),
  };
  await sgMail.send(msg);
}

/** Verifizierung */
export async function sendVerificationEmail({
  to, firstName, verificationUrl,
}: { to:string; firstName:string; verificationUrl:string }) {
  await send({
    to,
    // subject optional – kannst du im Verify‑Template setzen
    subject: 'Bitte bestätige deine E‑Mail für GrowGram',
    templateId: TPL_VERIFY,
    data: {
      firstName,
      verificationUrl,
      appName: 'GrowGram',
      year: new Date().getFullYear(),
      unsubscribeUrl: 'https://growgram.app/unsubscribe',
    },
    category: 'verify',
  });
}

/** Passwort‑Reset */
export async function sendPasswordResetEmail({
  to, firstName, resetUrl, appUrl,
}: { to:string; firstName:string; resetUrl:string; appUrl?:string }) {
  await send({
    to,
    // falls du das Subject im Template gesetzt hast, kannst du die Zeile löschen:
    subject: 'GrowGram – Passwort zurücksetzen',
    templateId: TPL_RESET,
    data: {
      firstName,
      resetUrl,
      appUrl: appUrl || process.env.APP_URL || 'https://growgram.web.app',
      appName: 'GrowGram',
      year: new Date().getFullYear(),
      validityMinutes: 60,
    },
    category: 'password-reset',
  });
}