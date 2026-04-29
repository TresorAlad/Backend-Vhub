import { Request, Response, NextFunction } from 'express';
import admin, { isFirebaseAdminReady } from '../config/firebase';
import { sendError } from '../utils/http';

export interface AuthRequest extends Request {
  user?: admin.auth.DecodedIdToken;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!isFirebaseAdminReady) {
    return sendError(
      res,
      503,
      'Firebase Admin is not configured on the backend. Set FIREBASE_SERVICE_ACCOUNT_BASE64 or GOOGLE_APPLICATION_CREDENTIALS (+ FIREBASE_PROJECT_ID).'
    );
  }

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
    if (error instanceof Error && error.message.toLowerCase().includes('id token')) {
      return sendError(res, 401, 'Unauthorized: invalid Firebase ID token');
    }
    return sendError(res, 401, 'Unauthorized: invalid token');
  }
};
