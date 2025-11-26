// src/index.ts
// .env nur im Emulator/Vitest laden – in Prod kommen Secrets automatisch.
if (process.env.FUNCTIONS_EMULATOR || process.env.VITEST) {
  await import("dotenv/config");
}

import express from "express";
import { onRequest } from "firebase-functions/v2/https";
import { app } from "./app/app.js";
import { mountRoutes } from "./app/routes.js";
import {
  REGION,
  JWT_SECRET,
  SENDGRID_API_KEY,
  WEB_API_KEY,
  // ❌ ADMIN_TASK_TOKEN NICHT MEHR IMPORTIEREN
} from "./config/env.js";

/**
 * Alle Feature-Router (auth, posts, feed, users, chat, …) mounten.
 */
await mountRoutes(app);

/**
 * Haupt-API (z. B. via Hosting-Rewrites /auth, /nexus, …).
 * Name: nexusApi
 */
export const nexusApi = onRequest(
  {
    region: REGION,
    cors: false,
    maxInstances: 10,
    // ✅ nur die echten Secrets, KEIN ADMIN_TASK_TOKEN mehr
    secrets: [JWT_SECRET, SENDGRID_API_KEY, WEB_API_KEY],
  },
  (req, res): void => {
    (app as unknown as express.Express)(req as any, res as any);
  }
);

/**
 * Kleiner Ping-Endpoint
 */
export const nexusPing = onRequest(
  { region: REGION },
  (_req, res): void => {
    res.status(200).send("pong");
  }
);