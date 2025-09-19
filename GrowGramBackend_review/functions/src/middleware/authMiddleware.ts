// src/middleware/authMiddleware.ts
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthedRequest extends Request {
  user?: JwtPayload;
}

export const auth = (req: AuthedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: '❌ Kein Token vorhanden' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: '❌ Token ungültig oder abgelaufen' });
  }
};