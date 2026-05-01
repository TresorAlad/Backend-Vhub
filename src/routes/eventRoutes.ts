import { Router } from 'express';
import { getEvents, createEvent, deleteEvent, updateEvent, getEventStats } from '../controllers/eventController';
import { authenticate } from '../middlewares/auth';
import { requireRole } from '../middlewares/requireRole';
import { upload } from '../config/cloudinary';

const router = Router();

router.get('/', getEvents);
router.post('/', authenticate, requireRole('ORGANIZER', 'ADMIN'), upload.single('image'), createEvent);
router.delete('/:id', authenticate, requireRole('ORGANIZER', 'ADMIN'), deleteEvent);
router.put('/:id', authenticate, requireRole('ORGANIZER', 'ADMIN'), upload.single('image'), updateEvent);
router.get('/:id/stats', authenticate, requireRole('ORGANIZER', 'ADMIN'), getEventStats);

export default router;
