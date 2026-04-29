import { Router } from 'express';
import { createEvent, getEvents } from '../controllers/eventController';
import { authenticate } from '../middlewares/auth';
import { requireRole } from '../middlewares/requireRole';
import { upload } from '../config/cloudinary';

const router = Router();

router.get('/', getEvents);
router.post('/', authenticate, requireRole('ORGANIZER', 'ADMIN'), upload.single('image'), createEvent);

export default router;
