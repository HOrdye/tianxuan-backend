import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as adminService from '../services/admin.service';

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

    const result = await adminService.getUserList(params);

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
    console.error('获取用户列表失败:', error);
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
 */
export async function updateUserTier(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    const { tier } = req.body;

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
        message: '等级不能为空',
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

    await adminService.updateUserTier(req.user.userId, userId, tier);

    res.status(200).json({
      success: true,
      message: '用户等级修改成功',
    });
  } catch (error: any) {
    console.error('修改用户等级失败:', error);
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
 */
export async function adjustUserCoins(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    const { adjustmentAmount, reason, coinType } = req.body;

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
        message: '调整金额不能为空',
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

    const result = await adminService.adjustUserCoins(
      req.user.userId,
      userId,
      adjustmentAmount,
      reason || '管理员调整',
      coinType || 'tianji_coins_balance'
    );

    res.status(200).json({
      success: true,
      message: result.message || '天机币调整成功',
      data: {
        new_balance: result.new_balance,
      },
    });
  } catch (error: any) {
    console.error('调整用户天机币失败:', error);
    res.status(500).json({
      success: false,
      error: '调整用户天机币失败',
      message: error.message || '未知错误',
    });
  }
}

/**
 * 获取天机币交易流水
 * GET /api/admin/coin-transactions
 */
export async function getCoinTransactions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      page,
      pageSize,
      userId,
      startDate,
      endDate,
      type,
      status,
    } = req.query;

    const params: adminService.TransactionListParams = {
      page: page ? parseInt(page as string, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string, 10) : undefined,
      userId: userId as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      type: type as string | undefined,
      status: status as string | undefined,
    };

    const result = await adminService.getCoinTransactions(params);

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
    console.error('获取天机币交易流水失败:', error);
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
 */
export async function getPaymentTransactions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      page,
      pageSize,
      userId,
      startDate,
      endDate,
      type,
      status,
    } = req.query;

    const params: adminService.TransactionListParams = {
      page: page ? parseInt(page as string, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string, 10) : undefined,
      userId: userId as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      type: type as string | undefined,
      status: status as string | undefined,
    };

    const result = await adminService.getPaymentTransactions(params);

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
    console.error('获取支付交易流水失败:', error);
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
