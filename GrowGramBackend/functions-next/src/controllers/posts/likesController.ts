import type { Request, Response } from 'express';

export async function like(_req: Request, res: Response)   { return res.status(204).end(); }
export async function unlike(_req: Request, res: Response) { return res.status(204).end(); }