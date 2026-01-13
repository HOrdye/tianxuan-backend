import { Router } from 'express';
import {
  submitFeedback,
  checkFeedbackStatus,
  getFeedbackStats,
} from '../controllers/resonance.controller';
import { authenticateToken } from '../middleware/auth.middleware';

/**
 * 共振反馈路由模块
 * 定义反馈相关的 API 路由
 */

const router = Router();

/**
 * POST /api/resonance/feedback
 * 提交反馈（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 请求体：
 * {
 *   "feedback_type": "bug",  // 反馈类型（如：bug, suggestion, praise等）
 *   "content": "反馈内容",    // 反馈内容
 *   "rating": 5,              // 评分（可选，1-5分）
 *   "metadata": { ... }       // 元数据（可选）
 * }
 * 
 * 响应：
 * {
 *   "success": true,
 *   "message": "反馈提交成功",
 *   "data": {
 *     "feedback_id": "uuid"
 *   }
 * }
 */
router.post('/feedback', authenticateToken, submitFeedback);

/**
 * GET /api/resonance/feedback/check
 * 检查反馈状态（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 查询参数：
 * - feedback_id: 反馈ID（必需）
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "feedback_id": "uuid",
 *     "status": "pending",  // pending, reviewed, resolved, rejected
 *     "reviewed_at": "2025-01-30T12:00:00Z",
 *     "reviewed_by": "uuid",
 *     "created_at": "2025-01-30T12:00:00Z",
 *     "updated_at": "2025-01-30T12:00:00Z"
 *   }
 * }
 */
router.get('/feedback/check', authenticateToken, checkFeedbackStatus);

/**
 * GET /api/resonance/feedback/stats
 * 获取反馈统计（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "total_count": 10,
 *     "pending_count": 5,
 *     "reviewed_count": 3,
 *     "resolved_count": 2,
 *     "rejected_count": 0,
 *     "average_rating": 4.5,
 *     "by_type": {
 *       "bug": 5,
 *       "suggestion": 3,
 *       "praise": 2
 *     }
 *   }
 * }
 */
router.get('/feedback/stats', authenticateToken, getFeedbackStats);

export default router;
