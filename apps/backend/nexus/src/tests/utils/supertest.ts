import request from 'supertest';
// Tests liegen unter src/tests/** → relativ zum src/Root:
import { app } from '../../app/app.js';

export const api = () => request(app);