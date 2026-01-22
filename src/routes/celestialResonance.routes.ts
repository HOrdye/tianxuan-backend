import { Router } from 'express';
import {
  calibrate,
  resonate,
  getManifestation,
  getTodayManifestation,
  decode,
} from '../controllers/celestialResonance.controller';
import { authenticateToken } from '../middleware/auth.middleware';

/**
 * 天感·今日气象路由模块
 * 定义天感相关的 API 路由
 */

const router = Router();

/**
 * POST /api/celestial-resonance/calibrate
 * 定念：记录用户输入数据（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 请求体：
 * {
 *   "profileId" / "profile_id"?: "self",  // 档案ID（可选，默认 'self'，支持 camelCase 和 snake_case）
 *   "calibrationData" / "calibration_data": {  // 定念数据（必填）
 *     "duration": 2000,              // 按压时长（毫秒）
 *     "mouseTrajectory": [0.5, 0.3], // 鼠标轨迹（归一化坐标）
 *     "timestamp": "2025-01-15T12:00:00Z",  // 时间戳
 *     "hour": 12                      // 时辰（0-23）
 *   }
 * }
 * 
 * 响应：
 * {
 *   "success": true,
 *   "message": "定念成功，共振参数已生成",
 *   "data": {
 *     "recordId": "uuid",
 *     "resonanceParams": { ... },
 *     "manifestationData": { ... }
 *   }
 * }
 */
router.post('/calibrate', authenticateToken, calibrate);

/**
 * POST /api/celestial-resonance/resonate
 * 共振：生成能量图谱（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 请求体：
 * {
 *   "profileId" / "profile_id"?: "self",  // 档案ID（可选，默认 'self'，支持 camelCase 和 snake_case）
 *   "calibrationData" / "calibration_data": {  // 定念数据（必填）
 *     "duration": 2000,
 *     "mouseTrajectory": [0.5, 0.3],
 *     "timestamp": "2025-01-15T12:00:00Z",
 *     "hour": 12
 *   }
 * }
 * 
 * 响应：
 * {
 *   "success": true,
 *   "message": "共振参数生成成功",
 *   "data": {
 *     "resonanceParams": { ... }
 *   }
 * }
 */
router.post('/resonate', authenticateToken, resonate);

/**
 * GET /api/celestial-resonance/manifestation/:id
 * 显化：获取今日图腾（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 路径参数：
 * - id: 记录ID（必填）
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "recordId": "uuid",
 *     "resonanceDate": "2025-01-15",
 *     "manifestationData": { ... },
 *     "isDecoded": false
 *   }
 * }
 */
router.get('/manifestation/:id', authenticateToken, getManifestation);

/**
 * GET /api/celestial-resonance/manifestation/today
 * 显化：获取今日图腾（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 查询参数：
 * - profileId / profile_id?: string - 档案ID（可选，默认 'self'，支持 camelCase 和 snake_case）
 * - date?: string - 日期（YYYY-MM-DD，可选，默认今天）
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "recordId": "uuid",
 *     "resonanceDate": "2025-01-15",
 *     "manifestationData": { ... },
 *     "isDecoded": false
 *   }
 * }
 */
router.get('/manifestation/today', authenticateToken, getTodayManifestation);

/**
 * POST /api/celestial-resonance/decode
 * 解码：免费获取专业解读（需要认证）
 * 
 * 注意：解码功能免费向所有注册用户开放，无需扣费
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 请求体：
 * {
 *   "recordId" / "record_id": "uuid"  // 记录ID（必填，支持 camelCase 和 snake_case）
 * }
 * 
 * 响应：
 * {
 *   "success": true,
 *   "message": "解码成功",
 *   "data": {
 *     "recordId": "uuid",
 *     "decodingData": { ... }
 *   }
 * }
 * 
 * 错误响应：
 * - 400: 参数错误
 * - 401: 未认证、无权访问
 * - 404: 记录不存在
 * - 500: 服务器错误
 */
router.post('/decode', authenticateToken, decode);

export default router;
