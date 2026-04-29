import { Request, Response, NextFunction } from 'express';
import admin from '../config/firebase';
import { sendError } from '../utils/http';

export interface AuthRequest extends Request {
  user?: admin.auth.DecodedIdToken;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authorizationHeader = req.headers.authorization;
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    return sendError(res, 401, 'Unauthorized: missing bearer token');
  }

  const token = authorizationHeader.split(' ')[1];

  if (!token) {
    return sendError(res, 401, 'Unauthorized: invalid bearer token');
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    return next();
  } catch (error) {
    console.error('Error verifying token:', error);
    return sendError(res, 401, 'Unauthorized: invalid token');
  }
};
