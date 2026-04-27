import { Router } from 'express';
import { createEvent, getEvents } from '../controllers/eventController';
import { authenticate } from '../middlewares/auth';
import { upload } from '../config/cloudinary';

const router = Router();

router.get('/', getEvents);
router.post('/', authenticate, upload.single('image'), createEvent);

export default router;
