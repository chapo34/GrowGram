// src/features/onboarding/navigation/AppNavigator.ts

export type RootStackParamList = {
  Auth: { screen?: 'Login' | 'Register' } | undefined;
  Main: undefined;
  WelcomeCompliance: { userId?: string } | undefined;
  Terms: { kind: 'terms' | 'privacy'; title?: string };
  Guidelines: { kind: 'guidelines'; title?: string };
};