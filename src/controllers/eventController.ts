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
