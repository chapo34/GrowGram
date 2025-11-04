import { z } from 'zod';

export const RegisterBody = z.object({
  email   : z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName : z.string().min(1),
  agree   : z.boolean().refine(v => v === true, { message: 'must be true' }),
  over18  : z.boolean().refine(v => v === true, { message: 'must be true' }),
});

export const LoginBody = z.object({
  email   : z.string().email(),
  password: z.string().min(8),
});

export const ComplianceAckBody = z.object({
  device: z.string().min(2),
  at: z.string().optional(),
});

export const VerifyEmailQuery = z.object({
  token: z.string().min(20),
  userId: z.string().min(1),
});