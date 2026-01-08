import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/admin.middleware';
import * as adminController from '../controllers/admin.controller';

const router = express.Router();

/**
 * 管理员路由
 * 所有路由都需要：
 * 1. 认证中间件（authenticateToken）
 * 2. 管理员权限检查（requireAdmin）
 */

// 用户管理
router.get(
  '/users',
  authenticateToken,
  requireAdmin,
  adminController.getUserList
);

router.get(
  '/users/:userId',
  authenticateToken,
  requireAdmin,
  adminController.getUserDetail
);

router.put(
  '/users/:userId/tier',
  authenticateToken,
  requireAdmin,
  adminController.updateUserTier
);

router.put(
  '/users/:userId/coins',
  authenticateToken,
  requireAdmin,
  adminController.adjustUserCoins
);

// 交易流水查询
router.get(
  '/coin-transactions',
  authenticateToken,
  requireAdmin,
  adminController.getCoinTransactions
);

router.get(
  '/payment-transactions',
  authenticateToken,
  requireAdmin,
  adminController.getPaymentTransactions
);

// 数据统计
router.get(
  '/stats/overview',
  authenticateToken,
  requireAdmin,
  adminController.getOverviewStats
);

router.get(
  '/stats/users',
  authenticateToken,
  requireAdmin,
  adminController.getUserStats
);

router.get(
  '/stats/revenue',
  authenticateToken,
  requireAdmin,
  adminController.getRevenueStats
);

export default router;
