import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import {
  getEventInteractions,
  registerToEvent,
  toggleFavorite,
  toggleFollowOrganizer,
  unregisterFromEvent,
} from '../controllers/interactionController';

const router = Router();

router.get('/events/:eventId', authenticate, getEventInteractions);
router.post('/events/:eventId/register', authenticate, registerToEvent);
router.delete('/events/:eventId/register', authenticate, unregisterFromEvent);
router.post('/events/:eventId/favorite', authenticate, toggleFavorite);
router.post('/organizers/:organizerId/follow', authenticate, toggleFollowOrganizer);

export default router;

