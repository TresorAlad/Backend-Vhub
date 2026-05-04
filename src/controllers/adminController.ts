import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { subWeeks, subMonths, startOfMonth, format } from 'date-fns';
import { sendError, sendSuccess } from '../utils/http';
import { sendNotificationToAllUsers } from '../config/notifications';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const totalEvents = await prisma.event.count();
    const activeEvents = await prisma.event.count({ where: { status: 'Live' } });
    const pendingEvents = await prisma.event.count({ where: { status: 'Pending' } });
    
    const totalUsers = await prisma.user.count();
    const lastWeek = subWeeks(new Date(), 1);
    const newUsersThisWeek = await prisma.user.count({
      where: { createdAt: { gte: lastWeek } },
    });

    const verifiedOrganizers = await prisma.user.count({
      where: { role: 'ORGANIZER', status: 'Active' },
    });

    const suspendedUsers = await prisma.user.count({
      where: { status: 'Suspended' },
    });

    // Revenue calculation (simple example: sum of prices of all events)
    // In a real app, this would be based on ticket sales/participations
    const eventsWithPrice = await prisma.event.findMany({
      select: { price: true },
    });
    const totalRevenue = eventsWithPrice.reduce((acc: number, curr: { price: number }) => acc + curr.price, 0);

    const ticketSales = await prisma.participation.count();

    // Mock growth for now, or calculate based on previous period
    const growth = 12.5;

    return sendSuccess(res, {
      totalEvents,
      activeEvents,
      pendingEvents,
      totalRevenue,
      ticketSales,
      totalUsers,
      newUsersThisWeek,
      verifiedOrganizers,
      pendingReviews: pendingEvents, // Mapping pending events to pending reviews for now
      suspendedUsers,
      growth,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return sendError(res, 500, 'Internal server error');
  }
};

export const getUserGrowth = async (req: Request, res: Response) => {
  try {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date);
      const monthName = format(date, 'MMM').toUpperCase();
      
      const count = await prisma.user.count({
        where: { createdAt: { lte: date } }, // Cumulative count
      });
      
      months.push({ month: monthName, value: count });
    }
    return sendSuccess(res, months);
  } catch (error) {
    console.error('Error fetching user growth:', error);
    return sendError(res, 500, 'Internal server error');
  }
};

export const getRecentActivity = async (req: Request, res: Response) => {
  try {
    const activities = await prisma.activity.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    return sendSuccess(res, activities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    return sendError(res, 500, 'Internal server error');
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return sendSuccess(res, users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return sendError(res, 500, 'Internal server error');
  }
};

export const getTransactions = async (req: Request, res: Response) => {
  try {
    const transactions = await prisma.transaction.findMany({
      include: {
        event: { select: { title: true } },
        organizer: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    
    // Format for frontend
    const formatted = transactions.map((tx: any) => ({
      id: tx.id,
      event: tx.event.title,
      organizer: tx.organizer.name,
      amount: tx.amount,
      date: format(tx.createdAt, 'MMM dd, yyyy'),
      status: tx.status,
    }));
    
    return sendSuccess(res, formatted);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return sendError(res, 500, 'Internal server error');
  }
};

export const getRevenueByMonth = async (req: Request, res: Response) => {
  try {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date);
      const monthName = format(date, 'MMM').toUpperCase();
      
      const transactions = await prisma.transaction.findMany({
        where: {
          createdAt: {
            gte: start,
            lte: date,
          },
          status: 'Completed',
        },
        select: { amount: true },
      });
      
      const total = transactions.reduce((acc: number, curr: { amount: number }) => acc + curr.amount, 0);
      months.push({ month: monthName, value: total });
    }
    return sendSuccess(res, months);
  } catch (error) {
    console.error('Error fetching revenue by month:', error);
    return sendError(res, 500, 'Internal server error');
  }
};

export const approveEvent = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  if (!id) return sendError(res, 422, 'Event id is required');

  try {
    const event = await prisma.event.findUnique({
      where: { id },
      include: { organizer: { select: { name: true } } },
    });
    if (!event) return sendError(res, 404, 'Event not found');

    const updated = await prisma.event.update({
      where: { id },
      data: { status: 'Live' as any },
    });

    // Notify everyone that a new event is available
    await sendNotificationToAllUsers(
      'Nouvel événement',
      `${updated.title} est maintenant disponible.`,
      { eventId: updated.id }
    ).catch((err) => console.error('Failed to send FCM notifications:', err));

    return sendSuccess(res, updated, 'Event approved');
  } catch (error) {
    console.error('approveEvent error:', error);
    return sendError(res, 500, 'Internal server error');
  }
};
export const approveOrganizerRole = async (req: Request, res: Response) => {
  const userId = req.params.userId as string;
  if (!userId) return sendError(res, 422, 'User id is required');

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return sendError(res, 404, 'User not found');

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role: 'ORGANIZER' },
    });

    return sendSuccess(res, updated, 'User promoted to ORGANIZER');
  } catch (error) {
    console.error('approveOrganizerRole error:', error);
    return sendError(res, 500, 'Internal server error');
  }
};
