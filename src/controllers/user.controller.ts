import { Response } from 'express';
import * as userService from '../services/user.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { getAvatarUrl, deleteAvatarFile } from '../services/upload.service';
import {
  sendSuccess,
  sendUnauthorized,
  sendBadRequest,
  sendNotFound,
  sendInternalError,
} from '../utils/response';

/**
 * 用户资料控制器模块
 * 处理用户资料相关的 HTTP 请求和响应
 */

/**
 * 获取当前用户资料控制器
 * GET /api/user/profile
 */
export async function getProfile(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const userId = req.user.userId;

    // 获取用户资料
    const profile = await userService.getProfile(userId);

    if (!profile) {
      sendNotFound(res, '用户资料不存在');
      return;
    }

    // 返回用户资料
    sendSuccess(res, profile);
  } catch (error: any) {
    console.error('获取用户资料失败:', error);
    sendInternalError(res, undefined, error);
  }
}

/**
 * 更新当前用户资料控制器
 * PUT /api/user/profile
 */
export async function updateProfile(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const userId = req.user.userId;
    const updateData = req.body;

    // 🐛 Debug: 记录控制器接收到的请求数据
    console.log('[updateProfile Controller] 接收到的请求数据:', JSON.stringify(updateData, null, 2));
    console.log('[updateProfile Controller] 用户ID:', userId);

    // 验证输入
    if (!updateData || Object.keys(updateData).length === 0) {
      sendBadRequest(res, '请提供要更新的数据');
      return;
    }

    // 更新用户资料
    const updatedProfile = await userService.updateProfile(userId, updateData);

    // 🐛 Debug: 记录返回给前端的数据
    console.log('[updateProfile Controller] 返回给前端的数据:', JSON.stringify(updatedProfile, null, 2));

    // 返回更新后的资料
    sendSuccess(res, updatedProfile, '资料更新成功');
  } catch (error: any) {
    console.error('更新用户资料失败:', error);

    if (error.message === '用户不存在') {
      sendNotFound(res, error.message);
      return;
    }

    // 头像格式错误返回 400 Bad Request
    if (error.message && (
      error.message.includes('头像必须是 URL 格式') ||
      error.message.includes('头像必须是有效的 URL')
    )) {
      sendBadRequest(res, error.message);
      return;
    }

    sendInternalError(res, undefined, error);
  }
}

/**
 * 获取当前用户等级控制器
 * GET /api/user/tier
 */
export async function getUserTier(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const userId = req.user.userId;

    // 获取用户等级
    const tier = await userService.getUserTier(userId);

    if (tier === null) {
      sendNotFound(res, '用户不存在');
      return;
    }

    // 返回用户等级
    sendSuccess(res, {
      tier: tier || 'explorer', // 默认为 explorer（登录注册但未付费的用户）
    });
  } catch (error: any) {
    console.error('获取用户等级失败:', error);
    sendInternalError(res, undefined, error);
  }
}

/**
 * 上传头像控制器
 * POST /api/user/avatar/upload
 */
export async function uploadAvatar(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const userId = req.user.userId;
    const file = req.file;

    if (!file) {
      sendBadRequest(res, '请选择要上传的头像文件');
      return;
    }

    // 获取旧头像 URL（用于删除旧文件）
    const profile = await userService.getProfile(userId, false);
    const oldAvatarUrl = profile?.avatar_url || null;

    // 生成头像 URL
    const avatarUrl = getAvatarUrl(file.filename);

    // 更新用户头像
    const updatedProfile = await userService.updateProfile(
      userId,
      { avatar_url: avatarUrl },
      true
    );

    // 删除旧头像文件（异步，不阻塞响应）
    if (oldAvatarUrl) {
      deleteAvatarFile(oldAvatarUrl);
    }

    // 返回更新后的资料和头像 URL
    sendSuccess(res, {
      avatar_url: avatarUrl,
      profile: updatedProfile,
    }, '头像上传成功');
  } catch (error: any) {
    console.error('上传头像失败:', error);

    if (error.message === '用户不存在') {
      sendNotFound(res, error.message);
      return;
    }

    // Multer 错误处理
    if (error.code === 'LIMIT_FILE_SIZE') {
      sendBadRequest(res, '文件大小超过限制（最大 5MB）');
      return;
    }

    if (error.message && (
      error.message.includes('不支持的文件类型') ||
      error.message.includes('文件大小超过限制')
    )) {
      sendBadRequest(res, error.message);
      return;
    }

    sendInternalError(res, undefined, error);
  }
}

/**
 * 用户档案存档相关控制器
 */

/**
 * 获取用户的所有档案控制器
 * GET /api/user/archives
 */
export async function getUserArchives(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const userId = req.user.userId;

    // 获取用户档案列表
    const archives = await userService.getArchives(userId);

    // 返回档案列表
    sendSuccess(res, archives, '获取成功');
  } catch (error: any) {
    console.error('获取用户档案列表失败:', error);
    
    if (error.message?.includes('参数错误')) {
      sendBadRequest(res, error.message);
      return;
    }

    sendInternalError(res, undefined, error);
  }
}

/**
 * 获取单个档案控制器
 * GET /api/user/archives/:archiveId
 */
export async function getUserArchiveById(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const userId = req.user.userId;
    const archiveId = req.params.archiveId;

    if (!archiveId) {
      sendBadRequest(res, '档案ID必须提供');
      return;
    }

    // 获取档案
    const archive = await userService.getArchiveById(userId, archiveId);

    if (!archive) {
      sendNotFound(res, '存档不存在或无权访问');
      return;
    }

    // 返回档案数据
    sendSuccess(res, archive, '获取成功');
  } catch (error: any) {
    console.error('获取档案失败:', error);
    
    if (error.message?.includes('参数错误')) {
      sendBadRequest(res, error.message);
      return;
    }

    sendInternalError(res, undefined, error);
  }
}

/**
 * 创建档案控制器
 * POST /api/user/archives
 */
export async function createUserArchive(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const userId = req.user.userId;
    const { name, birth_data, identity_tag, energy_level, private_note, relationship_type } = req.body;

    // 参数验证
    if (!name || !birth_data) {
      sendBadRequest(res, '档案名称和出生数据必须提供');
      return;
    }

    // 创建档案
    const archive = await userService.createArchive(userId, {
      name,
      birth_data,
      identity_tag,
      energy_level,
      private_note,
      relationship_type,
    });

    // 返回创建的档案
    sendSuccess(res, archive, '创建成功');
  } catch (error: any) {
    console.error('创建档案失败:', error);
    
    if (error.message?.includes('参数错误')) {
      sendBadRequest(res, error.message);
      return;
    }

    sendInternalError(res, undefined, error);
  }
}

/**
 * 更新档案控制器
 * PUT /api/user/archives/:archiveId
 */
export async function updateUserArchive(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const userId = req.user.userId;
    const archiveId = req.params.archiveId;
    const updateData = req.body;

    if (!archiveId) {
      sendBadRequest(res, '档案ID必须提供');
      return;
    }

    // 更新档案
    const updatedArchive = await userService.updateArchive(
      userId,
      archiveId,
      updateData
    );

    // 返回更新后的档案
    sendSuccess(res, updatedArchive, '更新成功');
  } catch (error: any) {
    console.error('更新档案失败:', error);
    
    if (error.message?.includes('参数错误')) {
      sendBadRequest(res, error.message);
      return;
    }

    if (error.message?.includes('存档不存在或无权访问')) {
      sendNotFound(res, error.message);
      return;
    }

    sendInternalError(res, undefined, error);
  }
}

/**
 * 删除档案控制器
 * DELETE /api/user/archives/:archiveId
 */
export async function deleteUserArchive(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const userId = req.user.userId;
    const archiveId = req.params.archiveId;

    if (!archiveId) {
      sendBadRequest(res, '档案ID必须提供');
      return;
    }

    // 删除档案
    await userService.deleteArchive(userId, archiveId);

    // 返回成功结果
    sendSuccess(res, { success: true }, '删除成功');
  } catch (error: any) {
    console.error('删除档案失败:', error);
    
    if (error.message?.includes('参数错误')) {
      sendBadRequest(res, error.message);
      return;
    }

    if (error.message?.includes('存档不存在或无权访问')) {
      sendNotFound(res, error.message);
      return;
    }

    sendInternalError(res, undefined, error);
  }
}

/**
 * 获取档案数量控制器
 * GET /api/user/archives/count
 */
export async function getArchivesCount(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const userId = req.user.userId;

    const count = await userService.getArchivesCount(userId);

    sendSuccess(res, { count });
  } catch (error: any) {
    console.error('获取档案数量失败:', error);
    sendInternalError(res, undefined, error);
  }
}

/**
 * 批量查询用户等级控制器
 * POST /api/users/batch-tiers
 */
export async function batchGetUserTiers(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      sendBadRequest(res, '用户ID列表不能为空');
      return;
    }

    const tierMap = await userService.batchGetUserTiers(userIds);

    sendSuccess(res, tierMap);
  } catch (error: any) {
    console.error('批量查询用户等级失败:', error);
    sendInternalError(res, undefined, error);
  }
}

/**
 * 检查用户是否存在控制器
 * GET /api/users/:id/exists
 */
export async function checkUserExists(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.params.id;

    if (!userId) {
      sendBadRequest(res, '用户ID不能为空');
      return;
    }

    const exists = await userService.userExists(userId);

    sendSuccess(res, { exists });
  } catch (error: any) {
    console.error('检查用户是否存在失败:', error);
    sendInternalError(res, undefined, error);
  }
}

/**
 * 删除用户账户控制器
 * DELETE /api/users/:id
 */
export async function deleteUserAccount(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user?.userId;

    if (!targetUserId) {
      sendBadRequest(res, '用户ID不能为空');
      return;
    }

    // 只能删除自己的账户，或者需要管理员权限
    if (targetUserId !== currentUserId) {
      // TODO: 检查管理员权限
      sendUnauthorized(res, '只能删除自己的账户');
      return;
    }

    await userService.deleteUserAccount(targetUserId);

    sendSuccess(res, { success: true }, '账户删除成功');
  } catch (error: any) {
    console.error('删除用户账户失败:', error);
    sendInternalError(res, undefined, error);
  }
}
