// ESM + Node 20
import sgMail from '@sendgrid/mail';
import type { MailDataRequired } from '@sendgrid/mail';
import dotenv from 'dotenv';
dotenv.config();

const API_KEY    = process.env.SENDGRID_API_KEY || '';
const FROM_EMAIL = process.env.SENDGRID_SENDER || 'no-reply@growgram-app.com';
const FROM_NAME  = process.env.SENDGRID_SENDER_NAME || 'GrowGram';

const TPL_VERIFY          = process.env.SENDGRID_TEMPLATE_VERIFY  || '';
const TPL_RESET           = process.env.SENDGRID_TEMPLATE_RESET   || '';
const TPL_WELCOME         = process.env.SENDGRID_TEMPLATE_WELCOME || '';
const TPL_WAITLISTCONFIRM = process.env.SENDGRID_TEMPLATE_WAITLISTCONFIRM || '';

const REPLY_TO  = process.env.SENDGRID_REPLY_TO || '';
const IP_POOL   = process.env.SENDGRID_IP_POOL || '';
const SANDBOX   = String(process.env.SENDGRID_SANDBOX || '').toLowerCase() === 'true';
const ASM_GROUP_WELCOME = process.env.SENDGRID_ASM_GROUP_WELCOME_ID
  ? Number(process.env.SENDGRID_ASM_GROUP_WELCOME_ID)
  : undefined;

// Wichtig: Website vs. API trennen
const APP_URL = (process.env.APP_URL || 'https://growgram-app.com').replace(/\/$/, '');
const API_BASE_URL = (process.env.API_BASE_URL || 'https://europe-west3-growgram-backend.cloudfunctions.net/api').replace(/\/$/, '');

const IS_DRY_RUN   = API_KEY.toLowerCase() === 'dryrun';
const HAS_LIVE_KEY = !!API_KEY && API_KEY.startsWith('SG.');
if (!IS_DRY_RUN && HAS_LIVE_KEY) sgMail.setApiKey(API_KEY);

type SendOpts = {
  to: string;
  subject?: string;
  templateId: string;
  data: Record<string, unknown>;
  category?: string;
  transactional?: boolean;
  userId?: string | number;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function assertHttpsAbsolute(url: string, label: string): string {
  const u = new URL(url);
  if (u.protocol !== 'https:') throw new Error(`${label} must be https`);
  return u.toString();
}

function previewLog(kind: string, opts: SendOpts) {
  const lines = [
    '📩 MOCK EMAIL PREVIEW (DRY-RUN)',
    `Kind: ${kind}`,
    `To:   ${opts.to}`,
    `From: ${FROM_NAME} <${FROM_EMAIL}>`,
    opts.subject ? `Subj: ${opts.subject}` : null,
    `Tpl:  ${opts.templateId || '(none)'}`,
    `Data: ${JSON.stringify(opts.data)}`,
  ].filter(Boolean);
  console.log(lines.join('\n'));
}

function ensureLiveReady(which: 'verify' | 'reset' | 'welcome' | 'waitlist') {
  if (IS_DRY_RUN) return;
  const missing: string[] = [];
  if (!HAS_LIVE_KEY) missing.push('SENDGRID_API_KEY(Format SG.*)');
  if (!FROM_EMAIL) missing.push('SENDGRID_SENDER');
  if (!FROM_NAME)  missing.push('SENDGRID_SENDER_NAME');

  if (which === 'verify'   && !TPL_VERIFY)          missing.push('SENDGRID_TEMPLATE_VERIFY');
  if (which === 'reset'    && !TPL_RESET)           missing.push('SENDGRID_TEMPLATE_RESET');
  if (which === 'welcome'  && !TPL_WELCOME)         missing.push('SENDGRID_TEMPLATE_WELCOME');
  if (which === 'waitlist' && !TPL_WAITLISTCONFIRM) missing.push('SENDGRID_TEMPLATE_WAITLISTCONFIRM');

  if (missing.length) {
    const err = new Error(`[emailService] Misconfiguration (LIVE, ${which}): ${missing.join(', ')}`);
    (err as any).status = 500;
    throw err;
  }
}

function parseValidityMinutes(): number | undefined {
  const raw = process.env.RESET_EXPIRES || '60m';
  const s = String(raw).trim().toLowerCase();
  if (/^\d+$/.test(s)) return Math.round(Number(s) / 60);
  const m = s.match(/^(\d+)\s*([smhd])$/);
  if (!m) return undefined;
  const n = Number(m[1]);
  const u = m[2];
  switch (u) {
    case 's': return Math.max(1, Math.round(n / 60));
    case 'm': return n;
    case 'h': return n * 60;
    case 'd': return n * 24 * 60;
    default:  return undefined;
  }
}

async function send(
  kind: 'verify' | 'password-reset' | 'welcome' | 'waitlist-confirm',
  opts: SendOpts
): Promise<void> {
  if (!EMAIL_RE.test(opts.to)) throw new Error('invalid_recipient_email');

  if (IS_DRY_RUN) {
    previewLog(kind, opts);
    console.log('✅ DRY-RUN: E-Mail simuliert, kein Versand.');
    return;
  }

  const msg: MailDataRequired = {
    to: opts.to,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    templateId: opts.templateId,
    dynamicTemplateData: opts.data,
    ...(opts.subject ? { subject: opts.subject } : {}),
    ...(opts.category ? { categories: [opts.category] } : {}),
    headers: { 'X-GrowGram-App': 'backend' },
    trackingSettings: {
      clickTracking: { enable: false, enableText: false },
      openTracking:  { enable: false },
    },
    mailSettings: {
      sandboxMode: { enable: SANDBOX },
      ...(opts.transactional ? { bypassListManagement: { enable: true } } : {}),
    },
    ...(REPLY_TO ? { replyTo: { email: REPLY_TO, name: FROM_NAME } } : {}),
    ...(IP_POOL ? { ipPoolName: IP_POOL } : {}),
    ...(opts.userId ? { customArgs: { userId: String(opts.userId), category: opts.category ?? kind } } : {}),
  };

  if (!opts.transactional && ASM_GROUP_WELCOME) (msg as any).asm = { groupId: ASM_GROUP_WELCOME };

  try {
    await sgMail.send(msg);
  } catch (e: any) {
    console.error('[emailService] send failed', {
      code: e?.code,
      message: e?.message,
      response: e?.response?.body?.errors || e?.response?.body || undefined,
    });
    const err = new Error('email_send_failed');
    (err as any).status = 502;
    throw err;
  }
}

/* --------- Mails --------- */

export async function sendVerificationEmail(params: {
  to: string;
  firstName: string;
  verificationUrl: string;
  userId?: string | number;
}) {
  ensureLiveReady('verify');
  const { to, firstName, verificationUrl, userId } = params;
  const safeUrl = assertHttpsAbsolute(verificationUrl, 'verificationUrl');

  await send('verify', {
    to,
    subject: 'Bitte bestätige deine E-Mail für GrowGram',
    templateId: TPL_VERIFY,
    transactional: true,
    userId,
    data: {
      firstName,
      verificationUrl: safeUrl, // offizieller Key
      confirmUrl:     safeUrl,  // Alias – damit dein Template sicher trifft
      appName: 'GrowGram',
      year: new Date().getFullYear(),
      unsubscribeUrl: '',
    },
    category: 'verify',
  });
}

export async function sendPasswordResetEmail(params: {
  to: string;
  firstName: string;
  resetUrl: string;
  appUrl?: string;
  userId?: string | number;
  validityMinutes?: number;
}) {
  ensureLiveReady('reset');
  const {
    to, firstName, resetUrl, appUrl, userId,
    validityMinutes = parseValidityMinutes() ?? 60,
  } = params;
  const safeReset = assertHttpsAbsolute(resetUrl, 'resetUrl');
  await send('password-reset', {
    to,
    subject: 'GrowGram – Passwort zurücksetzen',
    templateId: TPL_RESET,
    transactional: true,
    userId,
    data: {
      firstName,
      resetUrl: safeReset,
      appUrl: appUrl || APP_URL,
      appName: 'GrowGram',
      year: new Date().getFullYear(),
      validityMinutes,
    },
    category: 'password-reset',
  });
}

export async function sendWelcomeEmail(params: {
  to: string;
  firstName: string;
  username?: string;
  userId?: string | number;
}) {
  ensureLiveReady('welcome');
  const { to, firstName, username, userId } = params;
  await send('welcome', {
    to,
    subject: 'Willkommen bei GrowGram 🌱',
    templateId: TPL_WELCOME,
    transactional: false,
    userId,
    data: {
      firstName,
      username: username || '',
      appOpenUrl: process.env.APP_DEEPLINK || APP_URL,
      completeProfileUrl: `${APP_URL}/settings/profile`,
      exploreUrl: `${APP_URL}/explore`,
      preferencesUrl: `${APP_URL}/settings/notifications`,
      year: new Date().getFullYear(),
      unsubscribeUrl: `${APP_URL}/email/unsubscribe`,
    },
    category: 'welcome',
  });
}

/* ----- Waitlist: Confirm (Double-Opt-In) ----- */

export async function sendWaitlistConfirmEmail(params: {
  to: string;
  firstName: string;
  publicId: string;
  viewerToken: string;
  appUrl?: string;
  userId?: string | number;
}) {
  ensureLiveReady('waitlist');

  // Button führt IMMER zur Cloud-Functions API (setzt confirmedAt)
  const confirmUrl =
    `${API_BASE_URL}/waitlist/confirm?pid=${encodeURIComponent(params.publicId)}&t=${encodeURIComponent(params.viewerToken)}`;

  await send('waitlist-confirm', {
    to: params.to,
    subject: 'Bitte bestätige deine Anmeldung – GrowGram',
    templateId: TPL_WAITLISTCONFIRM,
    transactional: true,
    userId: params.userId,
    category: 'waitlist-confirm',
    data: {
      firstName: params.firstName || 'Friend',
      email: params.to,
      confirmUrl,                          // <— Wichtigster Key im Template
      discordUrl: 'https://discord.gg/JgXsnEKRQr',
      websiteUrl: (params.appUrl || APP_URL),
      year: new Date().getFullYear(),
    },
  });
}