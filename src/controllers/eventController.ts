import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import prisma from '../config/prisma';
import { sendNotificationToAllUsers } from '../config/notifications';

export const createEvent = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { title, description, date, endDate, location, category, latitude, longitude, participationMode, registrationMode, externalLink, price } = req.body;
  const imageUrl = req.file ? req.file.path : null;

  try {
    const user = await prisma.user.findUnique({
      where: { firebaseId: req.user.uid },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
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

    return res.status(201).json(event);
  } catch (error: any) {
    console.error('Error creating event:', error);
    return res.status(500).json({ message: error.message || String(error) });
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
    return res.status(200).json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
