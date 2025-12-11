// apps/mobile/src/features/auth/schema/registerSchema.ts
import { z } from "zod";

const MIN_AGE = 18;

export const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, "Benutzername ist zu kurz")
      .max(20, "Benutzername ist zu lang")
      .regex(
        /^[a-zA-Z0-9._]+$/,
        "Nur Buchstaben, Zahlen, Punkt und Unterstrich erlaubt",
      ),
    email: z.string().email("Bitte gib eine gültige E-Mail ein"),
    password: z
      .string()
      .min(8, "Mindestens 8 Zeichen")
      .regex(/[A-Z]/, "Mindestens ein Großbuchstabe")
      .regex(/[0-9]/, "Mindestens eine Zahl"),
    confirmPassword: z.string(),
    // Im Frontend arbeiten wir mit Date-Objekten
    birthDate: z.date(),
    // für späteres Setup optional
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    city: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwörter stimmen nicht überein",
  })
  .refine((data) => {
    const birth = data.birthDate;
    if (!(birth instanceof Date) || Number.isNaN(birth.getTime())) return false;

    const today = new Date();
    const minDate = new Date(
      today.getFullYear() - MIN_AGE,
      today.getMonth(),
      today.getDate(),
    );
    return birth <= minDate;
  }, {
    path: ["birthDate"],
    message: `Du musst mindestens ${MIN_AGE} Jahre alt sein`,
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;