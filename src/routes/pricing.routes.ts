
import { Router } from 'express';
import { getPricingQuote } from '../controllers/fortuneV2.controller';
import { authenticateToken } from '../middleware/auth.middleware';

/**
 * 询价路由模块
 */

const router = Router();

/**
 * GET /api/pricing/quote
 * 获取报价（透明计费）
 */
router.get('/quote', authenticateToken, getPricingQuote);

export default router;
