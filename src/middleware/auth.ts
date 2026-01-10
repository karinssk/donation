import { Request, Response, NextFunction } from 'express';
import adminService from '../services/adminService';

export interface AuthRequest extends Request {
  lineUserId?: string;
  isAdmin?: boolean;
}

export async function verifyLineUser(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const lineUserId = req.headers['x-line-userid'] as string;

  if (!lineUserId) {
    return res.status(401).json({ error: 'Unauthorized: LINE User ID required' });
  }

  req.lineUserId = lineUserId;
  next();
}

export async function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const lineUserId = req.lineUserId;

  if (!lineUserId) {
    return res.status(401).json({ error: 'Unauthorized: LINE User ID required' });
  }

  const isAdmin = await adminService.isAdmin(lineUserId);

  if (!isAdmin) {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }

  req.isAdmin = true;
  next();
}
