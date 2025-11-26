import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { complianceAck } from '../controllers/complianceController.js';

export const complianceRouter = Router();

// POST /compliance/ack
complianceRouter.post('/ack', authMiddleware, complianceAck);