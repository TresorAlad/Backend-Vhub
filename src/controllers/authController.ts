import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import prisma from '../config/prisma';

export const syncUser = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'User not found in request' });
  }

  const { uid, email, name, picture } = req.user;

  try {
    let user = await prisma.user.findUnique({
      where: { firebaseId: uid },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          firebaseId: uid,
          email: email || '',
          name: name || '',
          avatar: picture || '',
          role: 'USER', // Default role
        },
      });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error('Error syncing user:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'User not found in request' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { firebaseId: req.user.uid },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found in database' });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updatePushToken = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'User not found' });
  }

  const { pushToken } = req.body;

  try {
    await (prisma.user as any).update({
      where: { firebaseId: req.user.uid },
      data: { pushToken },
    });
    return res.status(200).json({ message: 'Push token updated' });
  } catch (error) {
    console.error('Error updating push token:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
export const updateProfile = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'User not found' });
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
    return res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
