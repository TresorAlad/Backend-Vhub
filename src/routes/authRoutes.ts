import { Router } from 'express';
import { syncUser, getProfile, updatePushToken, updateProfile, updateAvatar, requestOrganizerRole } from '../controllers/authController';
import { authenticate } from '../middlewares/auth';
import { upload } from '../config/cloudinary';

const router = Router();

router.post('/sync', authenticate, syncUser);
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.post('/avatar', authenticate, upload.single('avatar'), updateAvatar);
router.post('/push-token', authenticate, updatePushToken);
router.post('/request-organizer', authenticate, requestOrganizerRole);

export default router;
