import { Router } from 'express';
import { syncUser, getProfile, updatePushToken, updateProfile } from '../controllers/authController';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.post('/sync', authenticate, syncUser);
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.post('/push-token', authenticate, updatePushToken);

export default router;
