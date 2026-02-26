import { Router } from 'express';
import * as tarotController from '../controllers/tarot.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.post('/reading', authenticateToken, tarotController.generateReading);

export default router;
