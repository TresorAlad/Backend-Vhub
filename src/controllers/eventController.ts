import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import prisma from '../config/prisma';
import { sendNotificationToAllUsers } from '../config/notifications';
import { sendError, sendSuccess } from '../utils/http';

export const createEvent = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return sendError(res, 401, 'Unauthorized');
  }

  const { title, description, date, endDate, location, category, latitude, longitude, participationMode, registrationMode, externalLink, price } = req.body;
  if (!title || !description || !date || !location || !category) {
    return sendError(res, 422, 'Missing required event fields');
  }
  const imageUrl = req.file ? req.file.path : null;

  try {
    const user = await prisma.user.findUnique({
      where: { firebaseId: req.user.uid },
    });

    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    const event = await prisma.event.create({
      data: {
        title,
        description,
        date: new Date(date),
        // @ts-ignore
        endDate: endDate ? new Date(endDate) : null,
        location,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        imageUrl,
        category,
        status: 'Upcoming' as any, // Default all new events to Upcoming
        participationMode: participationMode || 'InPlace',
        registrationMode: registrationMode || 'Internal',
        externalLink: externalLink || null,
        price: price ? parseFloat(price) : 0,
        organizerId: user.id,
      },
    });

    // Send notifications to all users
    await sendNotificationToAllUsers(
      'New Event!',
      `Organizer ${user.name} just posted a new event: ${event.title}`,
      { eventId: event.id }
    ).catch(err => console.error('Failed to send notifications:', err));

    return sendSuccess(res, event, 'Event created', 201);
  } catch (error: any) {
    console.error('Error creating event:', error);
    return sendError(res, 500, error.message || 'Internal server error');
  }
};

export const getEvents = async (req: Request, res: Response) => {
  try {
    const events = await prisma.event.findMany({
      include: {
        organizer: {
          select: {
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });
    return sendSuccess(res, events);
  } catch (error) {
    console.error('Error fetching events:', error);
    return sendError(res, 500, 'Internal server error');
  }
};

export const deleteEvent = async (req: AuthRequest, res: Response) => {
  if (!req.user) return sendError(res, 401, 'Unauthorized');
  const id = req.params.id as string;
  try {
    const user = await prisma.user.findUnique({ where: { firebaseId: req.user.uid } });
    if (!user) return sendError(res, 404, 'User not found');

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) return sendError(res, 404, 'Event not found');

    if (event.organizerId !== user.id && user.role !== 'ADMIN') {
      return sendError(res, 403, 'Forbidden to delete this event');
    }

    await prisma.event.delete({ where: { id } });
    return sendSuccess(res, null, 'Event deleted successfully');
  } catch (error) {
    console.error('Error deleting event:', error);
    return sendError(res, 500, 'Internal server error');
  }
};

export const updateEvent = async (req: AuthRequest, res: Response) => {
  if (!req.user) return sendError(res, 401, 'Unauthorized');
  const id = req.params.id as string;
  const { title, description, date, endDate, location, category, latitude, longitude, participationMode, registrationMode, externalLink, price } = req.body;
  const imageUrl = req.file ? req.file.path : undefined;

  try {
    const user = await prisma.user.findUnique({ where: { firebaseId: req.user.uid } });
    if (!user) return sendError(res, 404, 'User not found');

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) return sendError(res, 404, 'Event not found');

    if (event.organizerId !== user.id && user.role !== 'ADMIN') {
      return sendError(res, 403, 'Forbidden to update this event');
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(date && { date: new Date(date) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(location && { location }),
        ...(category && { category }),
        ...(latitude && { latitude: parseFloat(latitude) }),
        ...(longitude && { longitude: parseFloat(longitude) }),
        ...(participationMode && { participationMode }),
        ...(registrationMode && { registrationMode }),
        ...(externalLink !== undefined && { externalLink }),
        ...(price && { price: parseFloat(price) }),
        ...(imageUrl && { imageUrl }),
      },
    });
    return sendSuccess(res, updatedEvent, 'Event updated successfully');
  } catch (error) {
    console.error('Error updating event:', error);
    return sendError(res, 500, 'Internal server error');
  }
};

export const getEventStats = async (req: AuthRequest, res: Response) => {
  if (!req.user) return sendError(res, 401, 'Unauthorized');
  const id = req.params.id as string;
  try {
    const user = await prisma.user.findUnique({ where: { firebaseId: req.user.uid } });
    if (!user) return sendError(res, 404, 'User not found');

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        participants: {
          include: { user: { select: { id: true, name: true, email: true, avatar: true } } }
        },
        favorites: true,
      }
    });
    if (!event) return sendError(res, 404, 'Event not found');

    if (event.organizerId !== user.id && user.role !== 'ADMIN') {
      return sendError(res, 403, 'Forbidden to view stats for this event');
    }

    const stats = {
      registrations: event.participants.length,
      favorites: event.favorites.length,
      shares: 0,
      participants: (event.participants || []).map(p => ({
        id: p.user?.id || 'Inconnu',
        name: p.user?.name || 'Utilisateur',
        email: p.user?.email || '',
        profileImage: p.user?.avatar || '',
        registeredAt: p.createdAt
      }))
    };

    return sendSuccess(res, stats);
  } catch (error: any) {
    console.error('Error fetching event stats:', error);
    return sendError(res, 500, error.message || 'Internal server error');
  }
};
