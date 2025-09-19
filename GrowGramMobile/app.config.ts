import 'dotenv/config';
import { ExpoConfig } from 'expo/config';

const API_BASE_FALLBACK =
  process.env.API_BASE_URL ??
  'https://europe-west3-growgram-backend.cloudfunctions.net/api';

const config: ExpoConfig = {
  name: 'GrowGramMobile',
  slug: 'GrowGramMobile',
  scheme: 'growgram',
  version: '1.0.0',
  orientation: 'portrait',

  // Icons & Splash
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  splash: {
    image: './assets/splash.png',        // <- Datei so benennen
    resizeMode: 'contain',
    backgroundColor: '#0F1A14',
  },

  // sorgt u.a. dafür, dass das MP4 mitgebundled wird
  updates: { fallbackToCacheTimeout: 0 },
  assetBundlePatterns: ['**/*'],

  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.growgram.app',
    infoPlist: {
      NSPhotoLibraryUsageDescription:
        'Diese App benötigt Zugriff auf deine Fotomediathek, um Bilder zu teilen.',
      NSPhotoLibraryAddUsageDescription:
        'Diese App benötigt die Berechtigung, Bilder in deiner Mediathek zu speichern.',
      NSCameraUsageDescription:
        'Diese App benötigt Zugriff auf deine Kamera, um Fotos aufzunehmen.',
      NSMicrophoneUsageDescription:
        'Diese App benötigt Zugriff auf dein Mikrofon, um Sprachmemos aufzunehmen.',
    },
  },

  android: {
    package: 'com.growgram.app',
    adaptiveIcon: {
      foregroundImage: './assets/icon.png',
      backgroundColor: '#0F1A14',
    },
    permissions: [
      'RECORD_AUDIO',
      'CAMERA',
      'READ_MEDIA_IMAGES',
      'READ_MEDIA_VIDEO',
      'READ_MEDIA_AUDIO',
      'READ_EXTERNAL_STORAGE',
      'WRITE_EXTERNAL_STORAGE',
    ],
  },

  web: { favicon: './assets/favicon.png' },

  plugins: [
    'expo-font',
    'expo-splash-screen',
    [
      'expo-image-picker',
      {
        photosPermission: 'Erlaube GrowGram Zugriff auf deine Fotos, um Bilder zu teilen.',
        cameraPermission: 'Erlaube GrowGram Zugriff auf deine Kamera, um Fotos aufzunehmen.',
      },
    ],
    [
      'expo-av',
      {
        microphonePermission: 'Erlaube GrowGram Zugriff auf dein Mikrofon, um Sprachmemos aufzunehmen.',
      },
    ],
    [
      'expo-media-library',
      {
        photosPermission: 'Erlaube GrowGram Zugriff auf deine Mediathek, um Bilder auszuwählen.',
        savePhotosPermission: 'Erlaube GrowGram Bilder in deiner Mediathek zu speichern.',
      },
    ],
  ],

  extra: {
    FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
    FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
    FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
    FIREBASE_APP_ID: process.env.FIREBASE_APP_ID,
    FIREBASE_MEASUREMENT_ID: process.env.FIREBASE_MEASUREMENT_ID,

    API_BASE_URL: API_BASE_FALLBACK,
    EXPO_PUBLIC_API_BASE: process.env.EXPO_PUBLIC_API_BASE ?? API_BASE_FALLBACK,

    eas: { projectId: 'bed90425-1993-43ee-81a8-dd9fb733c956' },
  },
};

export default config;