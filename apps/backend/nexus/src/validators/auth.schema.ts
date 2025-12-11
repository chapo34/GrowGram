// src/validators/auth.schema.ts
import { z } from "zod";

/** ---------- Register / Login ---------- */

/**
 * Registrierung (First Flow):
 * - username: optional im Backend (Frontend darf ihn verpflichtend machen)
 * - email: Pflicht
 * - password: Pflicht (mind. 8 Zeichen)
 * - birthDate: optionaler ISO-String (YYYY-MM-DD)
 * - firstName / lastName / city: komplett optional → späteres Setup Profile
 */
export const RegisterBody = z.object({
  email: z.string().email(),
  password: z.string().min(8),

  // alles für Setup Profile → optional
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  city: z.string().optional(),

  // ISO (YYYY-MM-DD) oder leer
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Geburtsdatum muss YYYY-MM-DD sein")
    .optional(),

  // Username darf fehlen (Backend), Frontend erzwingt ihn
  username: z
    .string()
    .regex(/^[a-zA-Z0-9._]{3,20}$/)
    .optional(),
});

/**
 * Login-Body:
 * - gleiche Regeln wie Register (mind. 8 Zeichen)
 */
export const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

/** ---------- Verify ---------- */

export const VerifyEmailQuery = z.object({
  token: z.string().min(10),
});

/** ---------- Compliance (16+/18+) ---------- */

export const ComplianceAckBody = z.object({
  agree: z.literal(true),
  over16: z.literal(true),
  over18: z.boolean().optional(),
  version: z.string().max(32).optional(),
  device: z.string().max(128).optional(),
});

/** ---------- Age Verification (Admin / KJM-Webhook) ---------- */

export const MarkAgeVerifiedBody = z.object({
  userId: z.string().min(3),
  provider: z.string().min(2).max(64),
  method: z.string().min(2).max(64),
  reference: z.string().max(128).optional(),
});

/** ---------- Types & Aliases ---------- */

export type RegisterBodyT = z.infer<typeof RegisterBody>;
export type LoginBodyT = z.infer<typeof LoginBody>;
export type VerifyEmailQueryT = z.infer<typeof VerifyEmailQuery>;
export type ComplianceAckBodyT = z.infer<typeof ComplianceAckBody>;
export type MarkAgeVerifiedBodyT = z.infer<typeof MarkAgeVerifiedBody>;

/** Legacy Aliases – falls irgendwo noch benutzt */
export const registerSchema = RegisterBody;
export const loginSchema = LoginBody;
export const verifySchema = VerifyEmailQuery;