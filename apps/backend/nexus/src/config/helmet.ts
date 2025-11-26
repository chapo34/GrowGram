import type { HelmetOptions } from 'helmet';

// Separate Options-Datei (falls du sie auch außerhalb von src/app/security.ts brauchst)
export const helmetOptions: HelmetOptions = {
  contentSecurityPolicy: false, // bei Bedarf für HTML-Responses gezielt aufsetzen
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  referrerPolicy: { policy: 'no-referrer' },
  frameguard: { action: 'deny' },
  hsts: false, // HSTS besser am Edge (Hosting/Proxy) aktivieren
  xssFilter: true,
  noSniff: true,
  dnsPrefetchControl: { allow: false },
  hidePoweredBy: true,
};