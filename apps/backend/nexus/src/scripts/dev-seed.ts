import type { Visibility } from '../types/domain.js';

// Dummy-Stubs – ersetze mit echten Repos.
const Users = {
  async create(_id: string, _data: any) { /* noop */ },
};
const Posts = {
  async createForAuthor(_authorId: string, _data: { text: string; tags: string[]; mediaUrls: string[]; visibility: Visibility }) {
    /* noop */
  },
};

async function run() {
  for (let i = 0; i < 3; i++) {
    const uid = `dev-seed-${i}`;
    await Users.create(uid, {
      email: `dev${i}@example.com`,
      firstName: 'Dev',
      lastName: `User${i}`,
      isVerified: i % 2 === 0,
      compliance: { agreed: true, over18: true, version: '1.0.0' }, // ✅ erlaubt
    });

    // ❗ KEIN authorId im Body
    await Posts.createForAuthor(uid, {
      text: `Seed post ${i}`,
      tags: ['seed'],
      mediaUrls: [],
      visibility: 'public',
    });
  }
}

run().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});