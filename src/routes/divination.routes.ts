import { Router } from 'express';
import {
  createHistory,
  getHistoryList,
  deleteHistory,
} from '../controllers/divination.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.post('/history', authenticateToken, createHistory);

router.get('/history', authenticateToken, getHistoryList);

router.delete('/history/:id', authenticateToken, deleteHistory);

export default router;
