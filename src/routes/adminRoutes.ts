import { Router } from 'express';
import { getDashboardStats, getUserGrowth, getRecentActivity, getAllUsers, getTransactions, getRevenueByMonth, approveEvent, approveOrganizerRole } from '../controllers/adminController';
import { authenticate } from '../middlewares/auth';
import { requireRole } from '../middlewares/requireRole';

const router = Router();

router.get('/stats', authenticate, requireRole('ADMIN'), getDashboardStats);
router.get('/user-growth', authenticate, requireRole('ADMIN'), getUserGrowth);
router.get('/activity', authenticate, requireRole('ADMIN'), getRecentActivity);
router.get('/users', authenticate, requireRole('ADMIN'), getAllUsers);
router.get('/transactions', authenticate, requireRole('ADMIN'), getTransactions);
router.get('/revenue-growth', authenticate, requireRole('ADMIN'), getRevenueByMonth);
router.post('/events/:id/approve', authenticate, requireRole('ADMIN'), approveEvent);
router.post('/users/:userId/approve-organizer', authenticate, requireRole('ADMIN'), approveOrganizerRole);

export default router;
