// src/scripts/fix-data.ts
/**
 * Data Fix / Migration Helper.
 *
 * Run examples:
 *  - Emulator: npx ts-node --swc --transpile-only src/scripts/fix-data.ts -- --emulator
 *  - Dry run:  npx ts-node --swc --transpile-only src/scripts/fix-data.ts -- --dry-run
 *
 * Flags:
 *   --emulator               -> FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 (falls nicht gesetzt)
 *   --dry-run                -> nur zählen/loggen, nicht schreiben
 *   --limit=500              -> max Dokumente pro Collection
 */

import '../config/env.js';
import { admin, db } from '../config/firebase.js';

type Flags = {
  emulator: boolean;
  dryRun: boolean;
  limit: number;
};

function parseFlags(): Flags {
  const argv = process.argv.slice(process.argv.indexOf('--') + 1).filter(Boolean);

  const getBool = (k: string) =>
    argv.includes(`--${k}`) ||
    argv.some(a => a.startsWith(`--${k}=`) && ['1','true','yes'].includes(a.split('=')[1]));

  const getNum = (k: string, def: number) => {
    const v = argv.find(a => a.startsWith(`--${k}=`));
    if (!v) return def;
    const n = Number(v.split('=')[1]);
    return Number.isFinite(n) && n > 0 ? n : def;
  };

  return {
    emulator: getBool('emulator'),
    dryRun: getBool('dry-run'),
    limit: getNum('limit', 500),
  };
}

async function ensureEmulatorIfFlagged(emulator: boolean) {
  if (emulator && !process.env.FIRESTORE_EMULATOR_HOST) {
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    console.log('↪️  Using Firestore Emulator at', process.env.FIRESTORE_EMULATOR_HOST);
  }
}

async function fixUsers(limit: number, dry: boolean) {
  console.log('👤 Fix users…');
  const snap = await db.collection('users').limit(limit).get();
  let writes = 0;

  const batch = db.batch();
  for (const doc of snap.docs) {
    const d: any = doc.data() || {};
    const patch: any = {};

    // Email lower-case
    if (typeof d.email === 'string' && d.email !== d.email.toLowerCase()) {
      patch.email = d.email.toLowerCase();
    }

    // Defaults
    if (typeof d.privateProfile !== 'boolean') patch.privateProfile = !!d.privateProfile;
    if (typeof d.hideSensitive !== 'boolean') patch.hideSensitive = !!d.hideSensitive;
    if (typeof d.pushOptIn !== 'boolean') patch.pushOptIn = !!d.pushOptIn;

    // Compliance shape
    if (d.compliance && typeof d.compliance === 'object') {
      patch.compliance = {
        agreed: !!d.compliance.agreed,
        over18: !!d.compliance.over18,
        version: d.compliance.version || '1.0.0',
        agreedAt: d.compliance.agreedAt || admin.firestore.FieldValue.serverTimestamp(),
      };
    }

    // Timestamps
    if (!d.createdAt) patch.createdAt = admin.firestore.FieldValue.serverTimestamp();
    patch.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    if (Object.keys(patch).length) {
      writes++;
      if (!dry) batch.set(doc.ref, patch, { merge: true });
    }
  }

  if (!dry && writes) await batch.commit();
  console.log(`   ✅ users fixed: ${writes}`);
}

async function fixPosts(limit: number, dry: boolean) {
  console.log('🖼️  Fix posts…');
  const snap = await db.collection('posts').limit(limit).get();
  let writes = 0;
  let i = 0;

  let batch = db.batch();
  const commitMaybe = async () => {
    if (i > 0 && i % 400 === 0) {
      if (!dry) await batch.commit();
      batch = db.batch();
    }
  };

  for (const doc of snap.docs) {
    const d: any = doc.data() || {};
    const patch: any = {};

    if (!Array.isArray(d.mediaUrls)) patch.mediaUrls = Array.isArray(d.mediaUrls) ? d.mediaUrls : [];
    if (!Array.isArray(d.tags)) patch.tags = Array.isArray(d.tags) ? d.tags : [];
    if (!d.visibility) patch.visibility = 'public';
    if (typeof d.likesCount !== 'number') patch.likesCount = Number(d.likesCount) || 0;
    if (typeof d.commentsCount !== 'number') patch.commentsCount = Number(d.commentsCount) || 0;
    if (typeof d.score !== 'number') patch.score = Number(d.score) || 0;

    if (!d.createdAt) patch.createdAt = admin.firestore.FieldValue.serverTimestamp();
    patch.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    if (Object.keys(patch).length) {
      writes++;
      if (!dry) batch.set(doc.ref, patch, { merge: true });
      i++;
      await commitMaybe();
    }
  }

  if (!dry && i % 400 !== 0) await batch.commit();
  console.log(`   ✅ posts fixed: ${writes}`);
}

async function main() {
  const flags = parseFlags();
  await ensureEmulatorIfFlagged(flags.emulator);

  console.log('⚙️  fix-data flags:', flags);

  await fixUsers(flags.limit, flags.dryRun);
  await fixPosts(flags.limit, flags.dryRun);

  console.log('✅ Data fix done.');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ fix-data failed:', err);
  process.exit(1);
});