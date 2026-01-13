import { Router } from 'express';
import {
  getUserTasks,
  completeTask,
  claimTaskReward,
  initializeUserTasks,
  getTaskProgress,
} from '../controllers/task.controller';
import { authenticateToken } from '../middleware/auth.middleware';

/**
 * 任务路由模块
 * 定义任务相关的 API 路由
 */

const router = Router();

/**
 * GET /api/tasks
 * 获取用户所有任务状态（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "tasks": [
 *       {
 *         "id": "uuid",
 *         "user_id": "uuid",
 *         "task_type": "complete_first_chart",
 *         "task_status": "pending" | "completed" | "claimed",
 *         "completed_at": "2025-01-01T00:00:00Z",
 *         "claimed_at": "2025-01-01T00:00:00Z",
 *         "coins_rewarded": 100,
 *         "created_at": "2025-01-01T00:00:00Z",
 *         "updated_at": "2025-01-01T00:00:00Z"
 *       }
 *     ]
 *   },
 *   "message": "获取成功"
 * }
 */
router.get('/', authenticateToken, getUserTasks);

/**
 * POST /api/tasks/complete
 * 完成任务（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * Content-Type: application/json
 * 
 * 请求体：
 * {
 *   "taskType": "complete_first_chart"
 * }
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "task": { ... },
 *     "alreadyCompleted": false
 *   },
 *   "message": "任务已完成"
 * }
 */
router.post('/complete', authenticateToken, completeTask);

/**
 * POST /api/tasks/claim
 * 领取任务奖励（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * Content-Type: application/json
 * 
 * 请求体：
 * {
 *   "taskType": "complete_first_chart"
 * }
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "coinsGranted": 100
 *   },
 *   "message": "奖励已领取"
 * }
 */
router.post('/claim', authenticateToken, claimTaskReward);

/**
 * POST /api/tasks/initialize
 * 初始化新用户任务（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "success": true
 *   },
 *   "message": "任务初始化成功"
 * }
 */
router.post('/initialize', authenticateToken, initializeUserTasks);

/**
 * GET /api/tasks/progress
 * 获取任务完成进度（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "total": 7,
 *     "completed": 3,
 *     "claimed": 2,
 *     "progress": 43
 *   },
 *   "message": "获取成功"
 * }
 */
router.get('/progress', authenticateToken, getTaskProgress);

export default router;
