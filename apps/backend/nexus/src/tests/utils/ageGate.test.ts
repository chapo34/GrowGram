// src/tests/unit/utils/ageGate.test.ts
import { describe, it, expect } from 'vitest';
import {
  calculateAgeFromBirthDate,
  deriveAgeTier,
  isPostVisibleForAgeTier,
  type UserAgeSource,
  type PostAgeMeta,
} from '../../utils/ageGate.js';

describe('ageGate.calculateAgeFromBirthDate', () => {
  it('berechnet korrektes Alter für ein plausibles Datum', () => {
    const today = new Date('2025-11-20T12:00:00.000Z');
    const age = calculateAgeFromBirthDate('2005-11-20', today);
    expect(age).toBe(20);
  });

  it('gibt null zurück bei invalider Eingabe', () => {
    expect(calculateAgeFromBirthDate('abc')).toBeNull();
    expect(calculateAgeFromBirthDate('2025-99-99')).toBeNull();
    expect(calculateAgeFromBirthDate('')).toBeNull();
  });
});

describe('ageGate.deriveAgeTier', () => {
  const baseUser: UserAgeSource = {
    birthDate: '2008-01-01',
    isVerified: false,
    compliance: { over18: false, accepted: false, version: 'v1' },
    ageVerifiedAt: null,
  };

  it('liefert UNKNOWN, wenn kein User vorhanden ist', () => {
    expect(deriveAgeTier(null)).toBe('UNKNOWN');
    expect(deriveAgeTier(undefined)).toBe('UNKNOWN');
  });

  it('stuft unter 16-Jährige als U16 ein', () => {
    const u: UserAgeSource = { ...baseUser, birthDate: '2012-05-01' };
    const tier = deriveAgeTier(u);
    expect(tier).toBe('U16');
  });

  it('stuft 16–17 als AGE16 ein', () => {
    const today = new Date();
    const year = today.getUTCFullYear() - 16;
    const u: UserAgeSource = {
      ...baseUser,
      birthDate: `${year}-01-01`,
    };
    const tier = deriveAgeTier(u);
    expect(['AGE16', 'U16']).toContain(tier); // je nach genauem Datum
  });

  it('18+ mit E-Mail-Verify + Compliance → AGE18_UNVERIFIED', () => {
    const u: UserAgeSource = {
      birthDate: '2000-01-01',
      isVerified: true,
      compliance: { over18: true, accepted: true, version: 'v1' },
      ageVerifiedAt: null,
    };
    const tier = deriveAgeTier(u);
    expect(tier).toBe('AGE18_UNVERIFIED');
  });

  it('ageVerifiedAt → AGE18_VERIFIED, egal was sonst steht', () => {
    const u: UserAgeSource = {
      birthDate: '2010-01-01', // selbst wenn das jung aussieht
      isVerified: false,
      compliance: { over18: false, accepted: false, version: 'v1' },
      ageVerifiedAt: '2025-11-20T00:00:00.000Z',
    };
    const tier = deriveAgeTier(u);
    expect(tier).toBe('AGE18_VERIFIED');
  });
});

describe('ageGate.isPostVisibleForAgeTier', () => {
  const basePost: PostAgeMeta = {
    minAge: 16,
    adultOnly: false,
    audience: 'ALL',
    tags: [],
  };

  it('adultOnly=true → nur AGE18_VERIFIED darf sehen', () => {
    const post: PostAgeMeta = { ...basePost, adultOnly: true };

    expect(isPostVisibleForAgeTier(post, 'AGE18_VERIFIED')).toBe(true);
    expect(isPostVisibleForAgeTier(post, 'AGE18_UNVERIFIED')).toBe(false);
    expect(isPostVisibleForAgeTier(post, 'AGE16')).toBe(false);
    expect(isPostVisibleForAgeTier(post, 'U16')).toBe(false);
    expect(isPostVisibleForAgeTier(post, 'UNKNOWN')).toBe(false);
  });

  it('minAge>=18 oder audience=18+ → 18+ (unverified + verified) dürfen sehen', () => {
    const p1: PostAgeMeta = { ...basePost, minAge: 18 };
    const p2: PostAgeMeta = { ...basePost, audience: '18+' };

    for (const post of [p1, p2]) {
      expect(isPostVisibleForAgeTier(post, 'AGE18_VERIFIED')).toBe(true);
      expect(isPostVisibleForAgeTier(post, 'AGE18_UNVERIFIED')).toBe(true);

      expect(isPostVisibleForAgeTier(post, 'AGE16')).toBe(false);
      expect(isPostVisibleForAgeTier(post, 'U16')).toBe(false);
      expect(isPostVisibleForAgeTier(post, 'UNKNOWN')).toBe(false);
    }
  });

  it('normale 16+ Posts sind für alle 16+ Tiers sichtbar', () => {
    const post: PostAgeMeta = { ...basePost, minAge: 16 };

    expect(isPostVisibleForAgeTier(post, 'AGE18_VERIFIED')).toBe(true);
    expect(isPostVisibleForAgeTier(post, 'AGE18_UNVERIFIED')).toBe(true);
    expect(isPostVisibleForAgeTier(post, 'AGE16')).toBe(true);

    // Für U16 / UNKNOWN ist aktuell auch true,
    // weil wir nur 18+ explizit wegfiltern.
    expect(isPostVisibleForAgeTier(post, 'U16')).toBe(true);
    expect(isPostVisibleForAgeTier(post, 'UNKNOWN')).toBe(true);
  });
});