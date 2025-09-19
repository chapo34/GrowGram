// src/utils/validators.ts
import { body } from 'express-validator';

export const registerValidator = [
  body('firstName').notEmpty().withMessage('Vorname ist erforderlich'),
  body('lastName').notEmpty().withMessage('Nachname ist erforderlich'),
  body('email').isEmail().withMessage('Gültige E-Mail ist erforderlich'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Passwort muss mindestens 6 Zeichen haben'),
  body('birthDate').notEmpty().withMessage('Geburtsdatum ist erforderlich'),
  body('city').notEmpty().withMessage('Stadt ist erforderlich'),
];

export const loginValidator = [
  body('email').isEmail().withMessage('Gültige E-Mail ist erforderlich'),
  body('password').notEmpty().withMessage('Passwort ist erforderlich'),
];