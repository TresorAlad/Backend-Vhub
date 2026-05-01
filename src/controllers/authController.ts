import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import prisma from '../config/prisma';
import { sendError, sendSuccess } from '../utils/http';
import type { Request } from 'express';

type AppRole = 'USER' | 'ORGANIZER' | 'ADMIN';

export const syncUser = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return sendError(res, 401, 'User not found in request');
  }

  const { uid, email, name, picture } = req.user;
  const desiredRole = (req.body?.desiredRole as AppRole | undefined) ?? undefined;
  const organizationName =
    typeof req.body?.organizationName === 'string' ? req.body.organizationName.trim() : undefined;

  try {
    // Use an atomic upsert to avoid race conditions (multiple sync calls on first login)
    // that could otherwise create a duplicate and throw a unique constraint error.
    const roleToCreate: AppRole = desiredRole === 'ORGANIZER' ? 'ORGANIZER' : 'USER';

    const updateData: Record<string, unknown> = {};
    if (typeof email === 'string' && email.length > 0) updateData.email = email;
    if (typeof name === 'string' && name.length > 0) updateData.name = name;
    if (typeof picture === 'string' && picture.length > 0) updateData.avatar = picture;
    if (organizationName && organizationName.length > 0) updateData.organizationName = organizationName;

    // Some databases/enums may not include "ORGANIZER" yet. If creation fails due to role value,
    // we fallback to USER to keep mobile sign-in functional, and role upgrade can be handled later.
    const user = await prisma.user
      .upsert({
        where: { firebaseId: uid },
        create: {
          firebaseId: uid,
          email: email || '',
          name: name || '',
          organizationName: organizationName || '',
          avatar: picture || '',
          role: roleToCreate,
        },
        // Do not auto-upgrade roles here; only initial creation uses desiredRole.
        update: updateData,
      })
      .catch(async (err: unknown) => {
        if (roleToCreate !== 'ORGANIZER') throw err;
        console.warn('Upsert with ORGANIZER role failed, retrying with USER role.');
        return prisma.user.upsert({
          where: { firebaseId: uid },
          create: {
            firebaseId: uid,
            email: email || '',
            name: name || '',
            organizationName: organizationName || '',
            avatar: picture || '',
            role: 'USER',
          },
          update: updateData,
        });
      });

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

  const { name, avatar, bio, organizationName, email } = req.body;

  try {
    const updatedUser = await prisma.user.update({
      where: { firebaseId: req.user.uid },
      data: {
        email,
        name,
        organizationName,
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

export const updateAvatar = async (req: AuthRequest, res: Response) => {
  if (!req.user) return sendError(res, 401, 'User not found');
  const file = (req as unknown as Request & { file?: any }).file;
  const avatarUrl = file?.path;
  if (!avatarUrl || typeof avatarUrl !== 'string') {
    return sendError(res, 422, 'avatar file is required');
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { firebaseId: req.user.uid },
      data: { avatar: avatarUrl },
    });
    return sendSuccess(res, updatedUser, 'Avatar updated');
  } catch (error) {
    console.error('Error updating avatar:', error);
    return sendError(res, 500, 'Internal server error');
  }
};
