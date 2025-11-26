// src/tests/e2e/health.e2e.test.ts
import { describe, it, expect } from 'vitest';
import { api } from '../utils/supertest.js';

describe('health', () => {
  it('GET /api/health → 200 { ok: true, ts: number }', async () => {
    const res = await api().get('/api/health').expect(200);

    expect(res.body?.ok).toBe(true);
    expect(typeof res.body?.ts).toBe('number');
  });
});