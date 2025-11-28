// src/shared/config/app.ts
import Constants from 'expo-constants';

export const APP_NAME: string =
  (Constants.expoConfig as any)?.name ?? 'GrowGram';

export const APP_VERSION: string =
  (Constants.expoConfig as any)?.version ?? '0.0.0';

export const IS_DEV = __DEV__ === true;

export const PLATFORM: 'ios' | 'android' | 'web' = ((): any => {
  const p = Constants.platform as any;
  if (p?.ios) return 'ios';
  if (p?.android) return 'android';
  return 'web';
})();