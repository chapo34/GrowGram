import 'dotenv/config';
import { signAccessToken } from '../services/auth/jwt.service.js';

function pickArg(name: string, def = '') {
  const a = process.argv.find(x => x.startsWith(`--${name}=`));
  return a ? a.split('=')[1] : def;
}

const uid = pickArg('uid');
const email = pickArg('email');
const base = process.env.APP_BASEURL || 'http://127.0.0.1:5002';
const path = process.env.APP_REDIRECTURL || '/verified';

if (!uid || !email) {
  console.error('Usage: npx ts-node --swc --transpile-only src/scripts/dev-make-verify.ts --uid <UID> --email <MAIL>');
  process.exit(2);
}

const token = signAccessToken({ sub: uid, userId: uid, email });
const link = `${base}/auth/verify-email?userId=${encodeURIComponent(uid)}&token=${encodeURIComponent(token)}`;

console.log('Verify URL:', link);
console.log('Will redirect to:', `${base}${path}?status=ok`);