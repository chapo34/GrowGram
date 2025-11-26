import type { Visibility } from '../../types/domain.js';

// Hier nur Dummy-Stubs der Repos, um Compile sicherzustellen.
// Ersetze sie durch deine echten Implementierungen, falls vorhanden.
const Users = {
  async create(_id: string, _data: any) { /* noop */ },
};

const Posts = {
  async createForAuthor(_authorId: string, _data: { text: string; tags: string[]; mediaUrls: string[]; visibility: Visibility }) {
    /* noop */
  },
};

export async function seed() {
  const uid = 'seed-user-1';
  await Users.create(uid, {
    email: 'seed@example.com',
    firstName: 'Seed',
    lastName: 'User',
    isVerified: true,
    compliance: { agreed: true, over18: true, version: '1.0.0' }, // ✅ erlaubt durch Types-Fix
  });

  // ❗ KEIN authorId im Objekt – Autor separat übergeben
  await Posts.createForAuthor(uid, {
    text: 'Hello GrowGram 🌱',
    tags: ['welcome', 'growgram'],
    mediaUrls: [],
    visibility: 'public',
  });
}

export async function devSeed() {
  return seed();
}