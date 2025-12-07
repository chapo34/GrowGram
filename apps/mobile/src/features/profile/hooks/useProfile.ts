// src/features/profile/hooks/useProfile.ts

import { useCallback, useEffect, useState } from 'react';
import {
  apiGetMyProfile,
  type Profile,
} from '../utils/api';

type UseProfileResult = {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useProfile(): UseProfileResult {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiGetMyProfile();
      setProfile(data);
    } catch (err: any) {
      console.warn('[useProfile] failed to load profile', err);
      setError(
        err?.message ?? 'Profil konnte nicht geladen werden.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  return {
    profile,
    loading,
    error,
    refresh: loadProfile,
  };
}