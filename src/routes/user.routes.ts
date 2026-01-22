import { Router } from 'express';
import { 
  getProfile, 
  updateProfile, 
  getUserTier,
  getUserArchives,
  getUserArchiveById,
  createUserArchive,
  updateUserArchive,
  deleteUserArchive
} from '../controllers/user.controller';
import {
  getDestinyCard,
  updateDestinyCard,
  getCompleteness,
  syncBirthdayToContext,
  getImplicitTraits,
  updateImplicitTraits,
  deleteImplicitTraits,
} from '../controllers/user-digital-twin.controller';
import { authenticateToken } from '../middleware/auth.middleware';

/**
 * 用户资料路由模块
 * 定义用户资料相关的 API 路由
 */

const router = Router();

/**
 * @swagger
 * /api/user/profile:
 *   get:
 *     summary: 获取当前用户资料
 *     description: 获取当前用户的完整资料信息，包括基本信息和资料完整度
 *     tags: [用户数字孪生]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取用户资料
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         email:
 *                           type: string
 *                         username:
 *                           type: string
 *                         completeness:
 *                           type: number
 *                           description: 资料完整度（0-100）
 *                           example: 60
 *                         preferences:
 *                           type: object
 *                           nullable: true
 *                         implicit_traits:
 *                           type: object
 *                           nullable: true
 *       401:
 *         description: 未认证
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/profile', authenticateToken, getProfile);

/**
 * PUT /api/user/profile
 * 更新当前用户资料（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 请求体：
 * {
 *   "username": "newusername",
 *   "bio": "个人简介",
 *   "location": "北京",
 *   ...
 * }
 * 
 * 响应：
 * {
 *   "success": true,
 *   "message": "资料更新成功",
 *   "data": { ... }
 * }
 */
router.put('/profile', authenticateToken, updateProfile);

/**
 * GET /api/user/tier
 * 获取当前用户等级（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "tier": "guest" | "explorer" | "basic" | "premium" | "vip"
 *   }
 * }
 */
router.get('/tier', authenticateToken, getUserTier);

/**
 * GET /api/user/archives
 * 获取用户的所有档案（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": "uuid",
 *       "user_id": "uuid",
 *       "name": "档案名称",
 *       "birth_data": { ... },
 *       ...
 *     }
 *   ],
 *   "message": "获取成功"
 * }
 */
router.get('/archives', authenticateToken, getUserArchives);

/**
 * GET /api/user/archives/:archiveId
 * 获取单个档案（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "id": "uuid",
 *     "user_id": "uuid",
 *     "name": "档案名称",
 *     ...
 *   },
 *   "message": "获取成功"
 * }
 */
router.get('/archives/:archiveId', authenticateToken, getUserArchiveById);

/**
 * POST /api/user/archives
 * 创建新档案（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 请求体：
 * {
 *   "name": "档案名称",
 *   "birth_data": { ... },
 *   "identity_tag": "标签",
 *   "energy_level": "strong",
 *   "private_note": "备注",
 *   "relationship_type": "self"
 * }
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": { ... },
 *   "message": "创建成功"
 * }
 */
router.post('/archives', authenticateToken, createUserArchive);

/**
 * PUT /api/user/archives/:archiveId
 * 更新档案（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 请求体（部分字段，可选）：
 * {
 *   "name": "更新后的名称",
 *   "identity_tag": "更新后的标签",
 *   "energy_level": "weak",
 *   "latest_luck": "宜动",
 *   "private_note": "更新后的备注",
 *   "element_color": "#33FF57",
 *   "is_pinned": true,
 *   "relationship_type": "lover"
 * }
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": { ... },
 *   "message": "更新成功"
 * }
 */
router.put('/archives/:archiveId', authenticateToken, updateUserArchive);

/**
 * DELETE /api/user/archives/:archiveId
 * 删除档案（需要认证）
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
 *   "message": "删除成功"
 * }
 */
router.delete('/archives/:archiveId', authenticateToken, deleteUserArchive);

/**
 * @swagger
 * /api/user/destiny-card:
 *   get:
 *     summary: 获取命主名刺
 *     description: 获取当前用户的命主名刺信息，包括MBTI、职业、现状、愿景等显性层信息，以及资料完整度
 *     tags: [命主名刺]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取命主名刺
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/DestinyCard'
 *       401:
 *         description: 未认证
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: 用户不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/destiny-card', authenticateToken, getDestinyCard);

/**
 * @swagger
 * /api/user/destiny-card:
 *   put:
 *     summary: 更新命主名刺
 *     description: 更新用户的命主名刺信息，支持部分字段更新。更新后会自动计算完整度并发放奖励（如果达到奖励条件）
 *     tags: [命主名刺]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mbti:
 *                 type: string
 *                 nullable: true
 *                 example: INTJ
 *               profession:
 *                 type: string
 *                 nullable: true
 *                 example: 独立开发者
 *               currentStatus:
 *                 type: string
 *                 nullable: true
 *                 example: 刚被裁员，想创业
 *               wishes:
 *                 type: array
 *                 items:
 *                   type: string
 *                 nullable: true
 *                 example: [财务自由, 家庭和睦]
 *               energyLevel:
 *                 type: string
 *                 enum: [high, balanced, low]
 *                 nullable: true
 *                 example: balanced
 *               identity:
 *                 type: string
 *                 nullable: true
 *                 example: 紫微七杀·化杀为权
 *     responses:
 *       200:
 *         description: 更新成功，可能包含奖励事件
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         completeness:
 *                           type: number
 *                           description: 更新后的完整度
 *                           example: 60
 *                         events:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/RewardEvent'
 *                           nullable: true
 *                           description: 奖励事件列表（如果有新奖励）
 *       400:
 *         description: 参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: 未认证
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/destiny-card', authenticateToken, updateDestinyCard);

/**
 * @swagger
 * /api/user/completeness:
 *   get:
 *     summary: 获取资料完整度详情
 *     description: 获取当前用户的资料完整度详情，包括总分、各字段得分和下一个奖励阈值
 *     tags: [资料完整度]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取完整度详情
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/CompletenessResult'
 *       401:
 *         description: 未认证
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: 用户不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/completeness', authenticateToken, getCompleteness);

/**
 * @swagger
 * /api/user/sync-birthday-to-context:
 *   post:
 *     summary: 同步生辰信息到用户上下文
 *     description: 将生辰信息同步到用户上下文中，更新birthday字段和preferences.userContext.birthDate字段
 *     tags: [用户数字孪生]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - birthday
 *             properties:
 *               birthday:
 *                 type: string
 *                 format: date
 *                 description: 出生日期，格式：YYYY-MM-DD（推荐使用 birthday，与数据库字段名一致）
 *                 example: "1990-01-15"
 *               birthDate:
 *                 type: string
 *                 format: date
 *                 description: 出生日期（兼容字段，推荐使用 birthday）
 *                 example: "1990-01-15"
 *               birth_date:
 *                 type: string
 *                 format: date
 *                 description: 出生日期（兼容字段，推荐使用 birthday）
 *                 example: "1990-01-15"
 *               birthTime:
 *                 type: string
 *                 format: time
 *                 nullable: true
 *                 description: 出生时间，格式：HH:mm:ss
 *                 example: "14:30:00"
 *               birthLocation:
 *                 type: string
 *                 nullable: true
 *                 description: 出生地点
 *                 example: "北京市"
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *                 nullable: true
 *                 description: 性别
 *                 example: "male"
 *     responses:
 *       200:
 *         description: 同步成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         synced:
 *                           type: boolean
 *                           example: true
 *                         userContextUpdated:
 *                           type: boolean
 *                           example: true
 *                     message:
 *                       type: string
 *                       example: 生辰信息已同步到命主名刺
 *       400:
 *         description: 参数错误（birthday必填）或数据被锁定
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: 未认证
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: 用户不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/sync-birthday-to-context', authenticateToken, syncBirthdayToContext);

/**
 * @swagger
 * /api/user/implicit-traits:
 *   get:
 *     summary: 获取隐性信息
 *     description: 获取当前用户的隐性特征信息，包括推断角色、兴趣标签、风险偏好等
 *     tags: [隐性信息]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取隐性信息
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ImplicitTraits'
 *       401:
 *         description: 未认证
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: 用户不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/implicit-traits', authenticateToken, getImplicitTraits);

/**
 * @swagger
 * /api/user/implicit-traits:
 *   post:
 *     summary: 更新隐性信息
 *     description: 更新用户的隐性特征信息，支持合并和去重。数组字段会自动合并并去重，对象字段会深度合并
 *     tags: [隐性信息]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ImplicitTraits'
 *     responses:
 *       200:
 *         description: 更新成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ImplicitTraits'
 *                     message:
 *                       type: string
 *                       example: 隐性信息已更新
 *       400:
 *         description: 参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: 未认证
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: 用户不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/implicit-traits', authenticateToken, updateImplicitTraits);

/**
 * @swagger
 * /api/user/implicit-traits:
 *   delete:
 *     summary: 删除隐性信息
 *     description: 删除指定的隐性信息字段。如果不提供fields参数，则删除所有隐性信息
 *     tags: [隐性信息]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fields:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 要删除的字段名列表，如不提供则删除所有字段
 *                 example: [inferred_roles, interest_tags]
 *     responses:
 *       200:
 *         description: 删除成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         deleted:
 *                           type: array
 *                           items:
 *                             type: string
 *                           description: 已删除的字段列表
 *                           example: [inferred_roles, interest_tags]
 *                     message:
 *                       type: string
 *                       example: 已删除指定的隐性信息
 *       401:
 *         description: 未认证
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: 用户不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/implicit-traits', authenticateToken, deleteImplicitTraits);

export default router;
