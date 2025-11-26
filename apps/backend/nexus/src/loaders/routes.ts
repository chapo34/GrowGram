// src/loaders/routes.ts

/**
 * Diese Datei liefert nur string-typsichere Konstanten für Basispfade.
 * Praktisch für Tests, Health-Checks oder zentrale Doku.
 * Das eigentliche Mounting passiert in src/app/routes.ts.
 */

export const ApiBases = {
  Auth: '/auth',
  Users: '/users',
  Posts: '/posts',
  Feed: '/feed',
  Files: '/files',
  Chat: '/chat',
  Admin: '/admin',
  Taxonomy: '/taxonomy',
  Meta: '/meta',
  Waitlist: '/waitlist',
  SystemRoot: '/',   // health/version auf root & /api
  ApiRoot: '/api',
} as const;

export type ApiBase =
  | typeof ApiBases.Auth
  | typeof ApiBases.Users
  | typeof ApiBases.Posts
  | typeof ApiBases.Feed
  | typeof ApiBases.Files
  | typeof ApiBases.Chat
  | typeof ApiBases.Admin
  | typeof ApiBases.Taxonomy
  | typeof ApiBases.Meta
  | typeof ApiBases.Waitlist
  | typeof ApiBases.SystemRoot
  | typeof ApiBases.ApiRoot;

/** Hilfsfunktion für Tests/Probes: gibt alle Basispfade zurück. */
export function listApiBases(): ApiBase[] {
  return Object.values(ApiBases);
}