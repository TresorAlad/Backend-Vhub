import type { Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import type { AuthRequest } from './auth';
import { sendError } from '../utils/http';

type AppRole = 'USER' | 'ORGANIZER' | 'ADMIN';

export const requireRole = (...roles: AppRole[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const uid = req.user?.uid;
    if (!uid) {
      return sendError(res, 401, 'Unauthorized');
    }

    try {
      const user = await prisma.user.findUnique({
        where: { firebaseId: uid },
        select: { role: true },
      });

      if (!user) {
        return sendError(res, 404, 'User profile not found');
      }

      if (!roles.includes(user.role as AppRole)) {
        return sendError(res, 403, 'Forbidden: insufficient role');
      }

      return next();
    } catch (error) {
      console.error('Error checking role:', error);
      return sendError(res, 500, 'Internal server error');
    }
  };
};
