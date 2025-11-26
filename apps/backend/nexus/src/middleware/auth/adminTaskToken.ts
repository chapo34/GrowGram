// src/middleware/auth/adminTaskToken.ts
import type { RequestHandler } from "express";
import { getAdminTaskToken } from "../../config/env.js";

let cachedToken: string | null = null;

function resolveToken(): string {
  if (!cachedToken) {
    cachedToken = getAdminTaskToken();
  }
  return cachedToken;
}

/**
 * Middleware: Prüft x-admin-task-token gegen NEXUS_ADMIN_TASK_TOKEN.
 */
export const requireAdminTaskToken: RequestHandler = (req, res, next) => {
  const header = (req.header("x-admin-task-token") || "").trim();
  const expected = resolveToken();

  if (!header || header !== expected) {
    console.warn("[ADMIN_TASK] forbidden admin task", {
      len: header.length,
      prefix: header.slice(0, 6),
    });
    return res.status(403).json({ error: "forbidden" });
  }

  return next();
};

export default requireAdminTaskToken;