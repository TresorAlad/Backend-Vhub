import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { requireRole } from '../middlewares/requireRole';
import {
  approveOrganizerRequest,
  createOrganizerRequest,
  getMyOrganizerRequest,
  getOrganizerRequestById,
  listOrganizerRequests,
  rejectOrganizerRequest,
} from '../controllers/organizerRequestController';

const router = Router();

// User routes
router.post('/', authenticate, createOrganizerRequest);
router.get('/me', authenticate, getMyOrganizerRequest);

// Admin routes
router.get('/', authenticate, requireRole('ADMIN'), listOrganizerRequests);
router.get('/:id', authenticate, requireRole('ADMIN'), getOrganizerRequestById);
router.post('/:id/approve', authenticate, requireRole('ADMIN'), approveOrganizerRequest);
router.post('/:id/reject', authenticate, requireRole('ADMIN'), rejectOrganizerRequest);

export default router;

