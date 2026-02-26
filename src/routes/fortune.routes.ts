
import { Router } from 'express';
import { postFortuneFeedback } from '../controllers/fortune.controller';
import {
  postCheckin,
  getCheckins,
  getYearlyComparison,
} from '../controllers/fortuneV2.controller';
import { authenticateToken } from '../middleware/auth.middleware';

/**
 * 运势相关路由模块
 */

const router = Router();

/**
 * POST /api/fortune/feedback
 * 用户提交运势反馈（旧版，保留兼容）
 */
router.post('/feedback', authenticateToken, postFortuneFeedback);

// ============================================
// v2.0 — 今日复盘打卡
// ============================================

/**
 * POST /api/fortune/checkin
 * 提交或更新今日复盘打卡（幂等 UPSERT）
 */
router.post('/checkin', authenticateToken, postCheckin);

/**
 * GET /api/fortune/checkin
 * 查询打卡记录
 */
router.get('/checkin', authenticateToken, getCheckins);

// ============================================
// v2.0 — 年度同比 (YOY)
// ============================================

/**
 * GET /api/fortune/yearly-comparison
 * 获取年度同比数据
 */
router.get('/yearly-comparison', authenticateToken, getYearlyComparison);

export default router;
