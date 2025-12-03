import { Router } from 'express';
import { getServices, updatePrices } from '../controllers/service.controller';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getServices);
router.put('/update', authMiddleware, adminMiddleware, updatePrices);

export default router;