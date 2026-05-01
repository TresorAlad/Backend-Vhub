import type { Response } from 'express';
import type { AuthRequest } from '../middlewares/auth';
import prisma from '../config/prisma';
import { sendError, sendSuccess } from '../utils/http';

export const registerToEvent = async (req: AuthRequest, res: Response) => {
  if (!req.user) return sendError(res, 401, 'Unauthorized');
  const eventId = req.params.eventId as string;
  if (!eventId) return sendError(res, 422, 'eventId is required');

  try {
    const user = await prisma.user.findUnique({ where: { firebaseId: req.user.uid }, select: { id: true } });
    if (!user) return sendError(res, 404, 'User not found');

    // Ensure event exists
    const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true, date: true, endDate: true, status: true } });
    if (!event) return sendError(res, 404, 'Event not found');

    const now = new Date();
    // Use endDate if available, otherwise assume 4 hours duration
    const end = event.endDate ? new Date(event.endDate) : new Date(event.date.getTime() + 4 * 60 * 60 * 1000);
    if (end < now || String(event.status).toLowerCase() === 'past') {
      return sendError(res, 409, 'Event is expired');
    }

    const participation = await prisma.participation.upsert({
      where: { userId_eventId: { userId: user.id, eventId } },
      create: { userId: user.id, eventId, status: 'REGISTERED' },
      update: { status: 'REGISTERED' },
    });

    return sendSuccess(res, participation, 'Registered');
  } catch (e) {
    console.error('registerToEvent error:', e);
    return sendError(res, 500, 'Internal server error');
  }
};

export const unregisterFromEvent = async (req: AuthRequest, res: Response) => {
  if (!req.user) return sendError(res, 401, 'Unauthorized');
  const eventId = req.params.eventId as string;
  if (!eventId) return sendError(res, 422, 'eventId is required');

  try {
    const user = await prisma.user.findUnique({ where: { firebaseId: req.user.uid }, select: { id: true } });
    if (!user) return sendError(res, 404, 'User not found');

    await prisma.participation.delete({
      where: { userId_eventId: { userId: user.id, eventId } },
    });

    return sendSuccess(res, { eventId }, 'Unregistered');
  } catch (e: any) {
    // If it doesn't exist, treat as success
    if (e?.code === 'P2025') return sendSuccess(res, { eventId }, 'Already unregistered');
    console.error('unregisterFromEvent error:', e);
    return sendError(res, 500, 'Internal server error');
  }
};

export const toggleFavorite = async (req: AuthRequest, res: Response) => {
  if (!req.user) return sendError(res, 401, 'Unauthorized');
  const eventId = req.params.eventId as string;
  if (!eventId) return sendError(res, 422, 'eventId is required');

  try {
    const user = await prisma.user.findUnique({ where: { firebaseId: req.user.uid }, select: { id: true } });
    if (!user) return sendError(res, 404, 'User not found');

    const existing = await prisma.favorite.findUnique({
      where: { userId_eventId: { userId: user.id, eventId } },
      select: { id: true },
    });

    if (existing) {
      await prisma.favorite.delete({ where: { id: existing.id } });
      return sendSuccess(res, { favorited: false }, 'Removed from favorites');
    }

    await prisma.favorite.create({ data: { userId: user.id, eventId } });
    return sendSuccess(res, { favorited: true }, 'Added to favorites');
  } catch (e) {
    console.error('toggleFavorite error:', e);
    return sendError(res, 500, 'Internal server error');
  }
};

export const toggleFollowOrganizer = async (req: AuthRequest, res: Response) => {
  if (!req.user) return sendError(res, 401, 'Unauthorized');
  const organizerId = req.params.organizerId as string;
  if (!organizerId) return sendError(res, 422, 'organizerId is required');

  try {
    const me = await prisma.user.findUnique({ where: { firebaseId: req.user.uid }, select: { id: true } });
    if (!me) return sendError(res, 404, 'User not found');
    if (me.id === organizerId) return sendError(res, 409, 'Cannot follow yourself');

    const existing = await prisma.follow.findUnique({
      where: { followerId_organizerId: { followerId: me.id, organizerId } },
      select: { id: true },
    });

    if (existing) {
      await prisma.follow.delete({ where: { id: existing.id } });
      return sendSuccess(res, { following: false }, 'Unfollowed');
    }

    await prisma.follow.create({ data: { followerId: me.id, organizerId } });
    return sendSuccess(res, { following: true }, 'Followed');
  } catch (e) {
    console.error('toggleFollowOrganizer error:', e);
    return sendError(res, 500, 'Internal server error');
  }
};

export const getEventInteractions = async (req: AuthRequest, res: Response) => {
  if (!req.user) return sendError(res, 401, 'Unauthorized');
  const eventId = req.params.eventId as string;
  if (!eventId) return sendError(res, 422, 'eventId is required');

  try {
    const me = await prisma.user.findUnique({ where: { firebaseId: req.user.uid }, select: { id: true } });
    if (!me) return sendError(res, 404, 'User not found');

    const event = await prisma.event.findUnique({ where: { id: eventId }, select: { organizerId: true, date: true, endDate: true, status: true } });
    if (!event) return sendError(res, 404, 'Event not found');

    const [participation, favorite, follow] = await Promise.all([
      prisma.participation.findUnique({
        where: { userId_eventId: { userId: me.id, eventId } },
        select: { id: true },
      }),
      prisma.favorite.findUnique({
        where: { userId_eventId: { userId: me.id, eventId } },
        select: { id: true },
      }),
      me.id === event.organizerId
        ? Promise.resolve(null)
        : prisma.follow.findUnique({
            where: { followerId_organizerId: { followerId: me.id, organizerId: event.organizerId } },
            select: { id: true },
          }),
    ]);

    const end = event.endDate ? new Date(event.endDate) : new Date(event.date.getTime() + 4 * 60 * 60 * 1000);
    const expired = end < new Date() || String(event.status).toLowerCase() === 'past';
    return sendSuccess(res, {
      registered: Boolean(participation),
      favorited: Boolean(favorite),
      followingOrganizer: Boolean(follow),
      expired,
      organizerId: event.organizerId,
    });
  } catch (e) {
    console.error('getEventInteractions error:', e);
    return sendError(res, 500, 'Internal server error');
  }
};

