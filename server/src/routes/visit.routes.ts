import { Router } from 'express';
import { 
  getSlots, 
  bookVisit, 
  getUserVisits, 
  cancelVisit, 
  getAllVisitsAdmin, 
  toggleSlotAvailability,
  rescheduleVisit,
  toggleDayAvailability
} from '../controllers/visit.controller';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Publiczne / User
router.get('/slots', getSlots);
router.post('/book', authMiddleware, bookVisit);
router.get('/my-visits', authMiddleware, getUserVisits);
router.post('/cancel/:id', authMiddleware, cancelVisit);

// Admin
router.get('/admin/all', authMiddleware, adminMiddleware, getAllVisitsAdmin);
router.patch('/admin/toggle/:id', authMiddleware, adminMiddleware, toggleSlotAvailability);
router.post('/admin/reschedule', authMiddleware, adminMiddleware, rescheduleVisit);
router.post('/admin/toggle-day', authMiddleware, adminMiddleware, toggleDayAvailability);

export default router;