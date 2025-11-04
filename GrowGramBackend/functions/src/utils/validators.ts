// functions/src/utils/validators.ts
import { body, oneOf } from 'express-validator';

export const registerValidator = [
  body('firstName').trim().notEmpty().withMessage('Vorname ist erforderlich'),
  body('lastName').trim().notEmpty().withMessage('Nachname ist erforderlich'),
  body('email').isEmail().withMessage('Gültige E-Mail ist erforderlich'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Passwort muss mindestens 8 Zeichen haben'),

  // optional (bessere Conversion / DSGVO)
  body('birthDate')
    .optional()
    .isISO8601()
    .withMessage('Geburtsdatum muss ein gültiges Datum sein'),
  body('city')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 80 })
    .withMessage('Stadt darf maximal 80 Zeichen haben'),
  body('shareCity').optional().isBoolean(),
];

export const loginValidator = [
  // ✅ hier ist der Fix (message als Objekt)
  oneOf(
    [
      body('email').isEmail(),
      body('identifier').isString().trim().isLength({ min: 3, max: 100 }),
    ],
    { message: 'Gültige E-Mail oder Benutzername ist erforderlich' }
  ),
  body('password').notEmpty().withMessage('Passwort ist erforderlich'),
];