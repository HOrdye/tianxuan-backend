import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as adminService from '../services/admin.service';
import { isAdmin } from '../services/coins.service';

/**
 * 管理员控制器
 * 处理管理员后台相关的HTTP请求
 */

/**
 * 获取用户列表
 * GET /api/admin/users
 */
export async function getUserList(req: AuthRequest, res: Response): Promise<void> {
  try {
    console.log('🔍 [getUserList] 开始处理请求，查询参数:', req.query);
    
    const {
      page,
      pageSize,
      search,
      role,
      tier,
      sortBy,
      sortOrder,
    } = req.query;

    const params: adminService.UserListParams = {
      page: page ? parseInt(page as string, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string, 10) : undefined,
      search: search as string | undefined,
      role: role as string | undefined,
      tier: tier as string | undefined,
      sortBy: sortBy as string | undefined,
      sortOrder: sortOrder as 'asc' | 'desc' | undefined,
    };

    console.log('🔍 [getUserList] 调用服务层，参数:', params);
    const result = await adminService.getUserList(params);
    console.log('✅ [getUserList] 服务层返回成功，数据条数:', result.data.length);

    const responseData = {
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      },
    };
    
    console.log('📤 [getUserList] 准备发送响应，响应数据大小:', JSON.stringify(responseData).length, 'bytes');
    console.log('📤 [getUserList] 响应格式:', {
      hasSuccess: 'success' in responseData,
      hasData: 'data' in responseData,
      hasPagination: 'pagination' in responseData,
      dataLength: Array.isArray(responseData.data) ? responseData.data.length : 0,
    });
    
    res.status(200).json(responseData);
    console.log('✅ [getUserList] 响应已发送');
  } catch (error: any) {
    console.error('❌ [getUserList] 获取用户列表失败:', error);
    console.error('❌ [getUserList] 错误堆栈:', error.stack);
    res.status(500).json({
      success: false,
      error: '获取用户列表失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 获取用户详情
 * GET /api/admin/users/:userId
 */
export async function getUserDetail(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '用户ID不能为空',
      });
      return;
    }

    // 验证UUID格式（PostgreSQL会抛出错误，提前检查）
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      res.status(404).json({
        success: false,
        error: '用户不存在',
        message: '无效的用户ID格式',
      });
      return;
    }

    const user = await adminService.getUserDetail(userId);

    if (!user) {
      res.status(404).json({
        success: false,
        error: '用户不存在',
        message: '未找到指定的用户',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    console.error('获取用户详情失败:', error);
    // 如果是UUID格式错误，返回404而不是500
    if (error.message && error.message.includes('invalid input syntax for type uuid')) {
      res.status(404).json({
        success: false,
        error: '用户不存在',
        message: '无效的用户ID格式',
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: '获取用户详情失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 修改用户等级
 * PUT /api/admin/users/:userId/tier
 * 支持参数名：tier (后端) 或 newTier (前端)
 */
export async function updateUserTier(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    // 支持 tier (后端) 和 newTier (前端) 两种参数名
    // 使用空值合并运算符，优先使用 tier，如果不存在则使用 newTier
    const tier = req.body.tier ?? req.body.newTier;
    
    console.log('🔍 [updateUserTier] 收到请求:', {
      userId,
      body: req.body,
      hasTier: req.body.tier !== undefined,
      hasNewTier: req.body.newTier !== undefined,
      extractedTier: tier,
    });

    if (!userId) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '用户ID不能为空',
      });
      return;
    }

    if (!tier) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '等级不能为空（参数名：tier 或 newTier）',
      });
      return;
    }

    if (!req.user || !req.user.userId) {
      res.status(401).json({
        success: false,
        error: '未认证',
        message: '请先登录',
      });
      return;
    }

    console.log('✅ [updateUserTier] 参数验证通过，调用服务层');
    await adminService.updateUserTier(req.user.userId, userId, tier);
    console.log('✅ [updateUserTier] 服务层调用成功');

    res.status(200).json({
      success: true,
      message: '用户等级修改成功',
    });
  } catch (error: any) {
    console.error('❌ [updateUserTier] 修改用户等级失败:', error);
    console.error('❌ [updateUserTier] 错误详情:', {
      message: error.message,
      stack: error.stack,
      userId: req.params.userId,
      body: req.body,
    });
    res.status(500).json({
      success: false,
      error: '修改用户等级失败',
      message: error.message || '未知错误',
    });
  }
}

/**
 * 调整用户天机币
 * PUT /api/admin/users/:userId/coins
 * 支持参数名：adjustmentAmount (前端) 或 adjustment_amount (后端)
 */
export async function adjustUserCoins(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    // 支持 adjustmentAmount (前端) 和 adjustment_amount (后端) 两种参数名
    const adjustmentAmount = req.body.adjustmentAmount !== undefined 
      ? req.body.adjustmentAmount 
      : req.body.adjustment_amount;
    const { reason, coinType } = req.body;
    
    console.log('🔍 [adjustUserCoins] 收到请求:', {
      userId,
      body: req.body,
      extractedAdjustmentAmount: adjustmentAmount,
      reason,
      coinType,
    });

    if (!userId) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '用户ID不能为空',
      });
      return;
    }

    if (adjustmentAmount === undefined || adjustmentAmount === null) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '调整金额不能为空（参数名：adjustmentAmount 或 adjustment_amount）',
      });
      return;
    }

    // 验证 adjustmentAmount 是否为数字
    if (typeof adjustmentAmount !== 'number') {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '调整金额必须是数字',
      });
      return;
    }

    if (!req.user || !req.user.userId) {
      res.status(401).json({
        success: false,
        error: '未认证',
        message: '请先登录',
      });
      return;
    }

    console.log('✅ [adjustUserCoins] 参数验证通过，调用服务层');
    const result = await adminService.adjustUserCoins(
      req.user.userId,
      userId,
      adjustmentAmount,
      reason || '管理员调整',
      coinType || 'tianji_coins_balance'
    );
    console.log('✅ [adjustUserCoins] 服务层调用成功，结果:', result);

    res.status(200).json({
      success: true,
      message: result.message || '天机币调整成功',
      data: {
        new_balance: result.new_balance,
      },
    });
  } catch (error: any) {
    console.error('❌ [adjustUserCoins] 调整用户天机币失败:', error);
    console.error('❌ [adjustUserCoins] 错误详情:', {
      message: error.message,
      stack: error.stack,
      userId: req.params.userId,
      body: req.body,
    });
    res.status(500).json({
      success: false,
      error: '调整用户天机币失败',
      message: error.message || '未知错误',
    });
  }
}

/**
 * 更新用户角色
 * PUT /api/admin/users/:userId/role
 */
export async function updateUserRole(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    console.log('🔍 [updateUserRole] 收到请求:', {
      userId,
      role,
      operatorId: req.user?.userId,
      body: req.body,
    });

    if (!userId) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '用户ID不能为空',
      });
      return;
    }

    if (!role) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '角色不能为空',
      });
      return;
    }

    // 验证角色值
    if (role !== 'admin' && role !== 'user') {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '无效的角色值，必须是 "admin" 或 "user"',
      });
      return;
    }

    if (!req.user || !req.user.userId) {
      res.status(401).json({
        success: false,
        error: '未认证',
        message: '请先登录',
      });
      return;
    }

    console.log('✅ [updateUserRole] 参数验证通过，调用服务层');
    // 调用服务层更新用户角色
    await adminService.updateUserRole(req.user.userId, userId, role);
    console.log('✅ [updateUserRole] 服务层调用成功，用户角色已更新');

    res.status(200).json({
      success: true,
      message: '用户角色更新成功',
      data: {
        userId,
        role,
      },
    });
  } catch (error: any) {
    console.error('❌ [updateUserRole] 更新用户角色失败:', error);
    console.error('❌ [updateUserRole] 错误详情:', {
      message: error.message,
      stack: error.stack,
      userId: req.params.userId,
      role: req.body.role,
      operatorId: req.user?.userId,
    });
    
    // 处理已知错误
    if (error.message?.includes('用户不存在')) {
      res.status(404).json({
        success: false,
        error: '用户不存在',
        message: error.message,
      });
      return;
    }
    
    if (error.message?.includes('参数错误')) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: '更新用户角色失败',
      message: error.message || '未知错误',
    });
  }
}

/**
 * 获取天机币交易流水
 * GET /api/admin/coin-transactions
 * 支持参数名：userId (前端) 或 user_id (后端)
 */
export async function getCoinTransactions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      page,
      pageSize,
      userId: userIdQuery,
      user_id: userIdSnake,
      startDate,
      endDate,
      type,
      status,
    } = req.query;

    // 支持 userId (前端) 和 user_id (后端) 两种参数名
    const userId = (userIdQuery ?? userIdSnake) as string | undefined;

    console.log('🔍 [getCoinTransactions] 收到请求:', {
      url: req.url,
      originalUrl: req.originalUrl,
      query: req.query,
      queryKeys: Object.keys(req.query),
      extractedUserId: userId,
      hasUserId: userIdQuery !== undefined,
      hasUser_id: userIdSnake !== undefined,
      userIdQueryValue: userIdQuery,
      userIdSnakeValue: userIdSnake,
    });

    const params: adminService.TransactionListParams = {
      page: page ? parseInt(page as string, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string, 10) : undefined,
      userId: userId,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      type: type as string | undefined,
      status: status as string | undefined,
    };

    console.log('🔍 [getCoinTransactions] 调用服务层，参数:', params);
    const result = await adminService.getCoinTransactions(params);
    console.log('✅ [getCoinTransactions] 服务层返回成功，数据条数:', result.data.length);

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      },
    });
  } catch (error: any) {
    console.error('❌ [getCoinTransactions] 获取天机币交易流水失败:', error);
    console.error('❌ [getCoinTransactions] 错误详情:', {
      message: error.message,
      stack: error.stack,
      query: req.query,
    });
    res.status(500).json({
      success: false,
      error: '获取天机币交易流水失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 获取支付交易流水
 * GET /api/admin/payment-transactions
 * 支持参数名：userId (前端) 或 user_id (后端)
 */
export async function getPaymentTransactions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      page,
      pageSize,
      userId: userIdQuery,
      user_id: userIdSnake,
      startDate,
      endDate,
      type,
      status,
    } = req.query;

    // 支持 userId (前端) 和 user_id (后端) 两种参数名
    const userId = (userIdQuery ?? userIdSnake) as string | undefined;

    console.log('🔍 [getPaymentTransactions] 收到请求:', {
      query: req.query,
      extractedUserId: userId,
      hasUserId: userIdQuery !== undefined,
      hasUser_id: userIdSnake !== undefined,
    });

    const params: adminService.TransactionListParams = {
      page: page ? parseInt(page as string, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string, 10) : undefined,
      userId: userId,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      type: type as string | undefined,
      status: status as string | undefined,
    };

    console.log('🔍 [getPaymentTransactions] 调用服务层，参数:', params);
    const result = await adminService.getPaymentTransactions(params);
    console.log('✅ [getPaymentTransactions] 服务层返回成功，数据条数:', result.data.length);

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      },
    });
  } catch (error: any) {
    console.error('❌ [getPaymentTransactions] 获取支付交易流水失败:', error);
    console.error('❌ [getPaymentTransactions] 错误详情:', {
      message: error.message,
      stack: error.stack,
      query: req.query,
    });
    res.status(500).json({
      success: false,
      error: '获取支付交易流水失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 获取数据概览统计
 * GET /api/admin/stats/overview
 */
export async function getOverviewStats(req: AuthRequest, res: Response): Promise<void> {
  try {
    const stats = await adminService.getOverviewStats();

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('获取数据概览统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取数据概览统计失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 获取用户统计
 * GET /api/admin/stats/users
 */
export async function getUserStats(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { days } = req.query;
    const statsDays = days ? parseInt(days as string, 10) : 30;

    const stats = await adminService.getUserStats(statsDays);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('获取用户统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取用户统计失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 获取收入统计
 * GET /api/admin/stats/revenue
 */
export async function getRevenueStats(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { days } = req.query;
    const statsDays = days ? parseInt(days as string, 10) : 30;

    const stats = await adminService.getRevenueStats(statsDays);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('获取收入统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取收入统计失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 检查当前用户是否为管理员
 * GET /api/admin/check
 * 只需要认证，不需要管理员权限（普通用户也可以调用此接口检查自己的管理员状态）
 */
export async function checkAdminStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    // 检查是否已认证
    if (!req.user || !req.user.userId) {
      res.status(401).json({
        success: false,
        error: '未认证',
        message: '请先登录',
      });
      return;
    }

    const userId = req.user.userId;

    // 检查是否为管理员
    const adminStatus = await isAdmin(userId);

    res.status(200).json({
      success: true,
      data: {
        isAdmin: adminStatus,
        userId,
      },
    });
  } catch (error: any) {
    console.error('检查管理员状态失败:', error);
    res.status(500).json({
      success: false,
      error: '检查管理员状态失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
