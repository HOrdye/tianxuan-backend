import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
// 引入数据库模块
import { checkDatabaseHealth } from './config/database';
// 引入路由
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import coinsRoutes from './routes/coins.routes';
import checkinRoutes from './routes/checkin.routes';
import paymentRoutes from './routes/payment.routes';
import astrologyRoutes from './routes/astrology.routes';
import subscriptionRoutes from './routes/subscription.routes';
import adminRoutes from './routes/admin.routes';

dotenv.config();

const app = express();

// 基础中间件
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 🔍 请求日志中间件（用于调试）
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - 请求开始`);
  
  // 监听响应完成
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - 响应完成 (${duration}ms)`);
  });
  
  // 监听响应关闭（客户端断开连接）
  res.on('close', () => {
    const duration = Date.now() - start;
    if (!res.headersSent) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - 响应未发送就关闭 (${duration}ms)`);
    }
  });
  
  next();
});

// 🏠 根路由
app.get('/', (req, res) => {
  res.json({ 
    message: '天选后端服务已启动', 
    version: '1.0.0',
    env: process.env.NODE_ENV || 'development'
  });
});

// 🏥 真实健康检查接口 (升级版)
app.get('/health', async (req, res) => {
  // 实时检测数据库状态
  const isDbConnected = await checkDatabaseHealth();
  
  if (isDbConnected) {
    res.status(200).json({
      status: 'OK',
      database: 'connected ✅',
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(503).json({
      status: 'ERROR',
      database: 'disconnected ❌',
      timestamp: new Date().toISOString()
    });
  }
});

// 🔐 认证路由
app.use('/api/auth', authRoutes);

// 👤 用户资料路由
app.use('/api/user', userRoutes);

// 💰 天机币路由
app.use('/api/coins', coinsRoutes);

// 📅 签到路由
app.use('/api/checkin', checkinRoutes);

// 💳 支付路由
app.use('/api/payment', paymentRoutes);

// 🔮 紫微斗数路由
app.use('/api/astrology', astrologyRoutes);

// 💎 订阅/会员系统路由
app.use('/api/subscription', subscriptionRoutes);

// 👨‍💼 管理员后台路由
app.use('/api/admin', adminRoutes);

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: '接口不存在',
    path: req.path
  });
});

// 错误处理中间件
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    success: false,
    error: '服务器内部错误',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

export default app;
