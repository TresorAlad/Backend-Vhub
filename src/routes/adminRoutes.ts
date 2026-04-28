import { Router } from 'express';
import { getDashboardStats, getUserGrowth, getRecentActivity, getAllUsers, getTransactions, getRevenueByMonth } from '../controllers/adminController';
import { authenticate } from '../middlewares/auth';

const router = Router();

// In a real app, you'd check for ADMIN role here
router.get('/stats', authenticate, getDashboardStats);
router.get('/user-growth', authenticate, getUserGrowth);
router.get('/activity', authenticate, getRecentActivity);
router.get('/users', authenticate, getAllUsers);
router.get('/transactions', authenticate, getTransactions);
router.get('/revenue-growth', authenticate, getRevenueByMonth);

export default router;
