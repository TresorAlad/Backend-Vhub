import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import prisma from '../config/prisma';
import { sendError, sendSuccess } from '../utils/http';

type AppRole = 'USER' | 'ORGANIZER' | 'ADMIN';

export const syncUser = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return sendError(res, 401, 'User not found in request');
  }

  const { uid, email, name, picture } = req.user;
  const desiredRole = (req.body?.desiredRole as AppRole | undefined) ?? undefined;

  try {
    let user = await prisma.user.findUnique({
      where: { firebaseId: uid },
    });

    if (!user) {
      const roleToCreate: AppRole = desiredRole === 'ORGANIZER' ? 'ORGANIZER' : 'USER';
      user = await prisma.user.create({
        data: {
          firebaseId: uid,
          email: email || '',
          name: name || '',
          avatar: picture || '',
          role: roleToCreate,
        },
      });
    }

    return sendSuccess(res, user);
  } catch (error) {
    console.error('Error syncing user:', error);
    return sendError(res, 500, 'Internal server error');
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return sendError(res, 401, 'User not found in request');
  }

  try {
    const user = await prisma.user.findUnique({
      where: { firebaseId: req.user.uid },
    });

    if (!user) {
      return sendError(res, 404, 'User not found in database');
    }

    return sendSuccess(res, user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    return sendError(res, 500, 'Internal server error');
  }
};

export const updatePushToken = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return sendError(res, 401, 'User not found');
  }

  const { pushToken } = req.body;
  if (!pushToken || typeof pushToken !== 'string') {
    return sendError(res, 422, 'pushToken is required');
  }

  try {
    await (prisma.user as any).update({
      where: { firebaseId: req.user.uid },
      data: { pushToken },
    });
    return sendSuccess(res, { pushToken }, 'Push token updated');
  } catch (error) {
    console.error('Error updating push token:', error);
    return sendError(res, 500, 'Internal server error');
  }
};
export const updateProfile = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return sendError(res, 401, 'User not found');
  }

  const { name, avatar, bio } = req.body;

  try {
    const updatedUser = await prisma.user.update({
      where: { firebaseId: req.user.uid },
      data: {
        name,
        avatar,
        bio,
      },
    });
    return sendSuccess(res, updatedUser);
  } catch (error) {
    console.error('Error updating profile:', error);
    return sendError(res, 500, 'Internal server error');
  }
};
