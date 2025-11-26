import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { api } from '../utils/supertest.js';
import {
  getUserDocByEmail,
  purgeUserByEmail,
  waitFor,
  toBackendVerifyPath,
} from '../utils/emulators.js';

const EMAIL = 'kenzo.e2e@example.com';
const PASS  = 'secret123';

describe('Auth E2E: register → verify → login', () => {
  beforeAll(async () => {
    await purgeUserByEmail(EMAIL);
  });

  afterAll(async () => {
    // optional: cleanup
    // await purgeUserByEmail(EMAIL);
  });

  it('register returns 201 and verifyUrl', async () => {
    const res = await api()
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send({ email: EMAIL, password: PASS, firstName: 'Kenzo', lastName: 'Bully' });

    expect([200, 201]).toContain(res.status);
    expect(res.body).toHaveProperty('ok', true);
    expect(res.body).toHaveProperty('verifyUrl');
  });

  it('verify endpoint marks user as verified', async () => {
    // Frische verifyUrl holen (alternativ: aus vorherigem Test sharen)
    const reg = await api()
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send({ email: EMAIL, password: PASS, firstName: 'Kenzo', lastName: 'Bully' });

    const verifyUrl: string = reg.body.verifyUrl;
    expect(typeof verifyUrl).toBe('string');

    // ⬇️ HIER: Frontend-URL → Backend-Pfad
    const backendPath = toBackendVerifyPath(verifyUrl);

    const v = await api().get(backendPath);
    expect(v.status).toBeGreaterThanOrEqual(200);
    expect(v.status).toBeLessThan(400);

    // Warten bis Firestore-Flag gesetzt wurde
    const doc = await waitFor(
      () => getUserDocByEmail(EMAIL),
      (u) => !!u && (u as any).isVerified === true,
      { timeoutMs: 5000, intervalMs: 150 }
    );
    expect(doc && (doc as any).isVerified).toBe(true);
  });

  it('login returns 200 and accessToken', async () => {
    const res = await api()
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send({ email: EMAIL, password: PASS });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(typeof res.body.accessToken).toBe('string');
  });

  it('login with wrong password returns 401', async () => {
    const res = await api()
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send({ email: EMAIL, password: 'wrongpass' });

    expect(res.status).toBe(401);
  });
});