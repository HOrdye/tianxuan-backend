import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import multer from 'multer';
// 引入数据库模块
import { checkDatabaseHealth } from './config/database';
// 引入 Swagger 配置
import { swaggerSpec } from './config/swagger';
// 引入路由
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import usersRoutes from './routes/users.routes';
import coinsRoutes from './routes/coins.routes';
import checkinRoutes from './routes/checkin.routes';
import paymentRoutes from './routes/payment.routes';
import astrologyRoutes from './routes/astrology.routes';
import subscriptionRoutes from './routes/subscription.routes';
import adminRoutes from './routes/admin.routes';
import taskRoutes from './routes/task.routes';
import resonanceRoutes from './routes/resonance.routes';
import timespaceRoutes from './routes/timespace.routes';
import llmRoutes from './routes/llm.routes';
import celestialResonanceRoutes from './routes/celestialResonance.routes';
import divinationRoutes from './routes/divination.routes';
import tarotRoutes from './routes/tarot.routes';
import achievementsRoutes from './routes/achievements.routes';
import insightsRoutes from './routes/insights.routes';
import fortuneRoutes from './routes/fortune.routes';
import pricingRoutes from './routes/pricing.routes';

dotenv.config();

const app = express();

// ✅ CORS 配置修复
// 1. 如果环境变量有配置，使用环境变量
// 2. 否则使用默认白名单（包含本地和服务器地址）
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
  : [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:5174', // 根据导师建议，为前端开发端口添加白名单
      'http://49.232.243.107:5173',
    ];

app.use(helmet());
app.use(
  cors({
    origin: (origin, cb) => {
      // 允许无 origin 的请求（如 curl、Postman、服务器端请求）
      if (!origin) return cb(null, true);
      
      // 检查是否在白名单中
      if (corsOrigins.includes(origin)) {
        return cb(null, true);
      }
      
      // 开发环境：允许所有源（但会返回请求的 origin，而不是 *）
      if (process.env.NODE_ENV === 'development') {
        console.log('⚠️ [CORS] 开发模式：允许来源', origin);
        return cb(null, true);
      }
      
      // 生产环境：拒绝未授权的源
      console.log('❌ [CORS] 拒绝来源:', origin);
      return cb(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true,
    optionsSuccessStatus: 204,
  })
);

// JSON 解析中间件（带错误处理）
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 📝 请求日志中间件（用于调试）
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

// 📚 Swagger API 文档
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: '天选后端 API 文档',
}));

// 📁 静态文件服务（用于访问上传的文件）
const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadDir));

// 易经六十四卦 svg 文件
app.use('/dilemma', express.static(path.join(process.cwd(), 'public')));

// 🔐 认证路由
app.use('/api/auth', authRoutes);

// 👤 用户资料路由
app.use('/api/user', userRoutes);

// 👥 用户服务扩展路由
app.use('/api/users', usersRoutes);

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

// ✅ 任务系统路由
app.use('/api/tasks', taskRoutes);

// 🔄 共振反馈路由
app.use('/api/resonance', resonanceRoutes);

// 🌌 时空导航缓存路由
app.use('/api/timespace', timespaceRoutes);

// 🤖 LLM 路由
app.use('/api/llm', llmRoutes);

// 🌟 天体共振路由
app.use('/api/celestial-resonance', celestialResonanceRoutes);

// 🔮 占卜路由
app.use('/api/divination', divinationRoutes);

// 🃏 塔罗路由
app.use('/api/tarot', tarotRoutes);

// 🏆 成就路由
app.use('/api/achievements', achievementsRoutes);

// 💡 洞察路由
app.use('/api/insights', insightsRoutes);

// 🔮 运势路由（含 v2.0 打卡/YOY）
app.use('/api/fortune', fortuneRoutes);

// 💰 询价路由（v2.0 透明计费）
app.use('/api/pricing', pricingRoutes);

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: '接口不存在',
    path: req.path
  });
});

// 错误处理中间件（包括 multer 错误和 JSON 解析错误）
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Global Error Handler] 服务器错误:', {
    path: req.path,
    method: req.method,
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
    errorType: err.constructor?.name,
  });
  
  // 如果响应头已发送，不再尝试发送错误响应
  if (res.headersSent) {
    console.error('[Global Error Handler] 响应头已发送，无法发送错误响应');
    return;
  }
  
  // JSON 解析错误处理
  if (err instanceof SyntaxError && 'body' in err) {
    console.error('[Global Error Handler] JSON 解析错误');
    try {
      return res.status(400).json({
        success: false,
        error: '参数错误',
        message: '请求体格式错误，请检查 JSON 格式',
      });
    } catch (responseErr) {
      console.error('[Global Error Handler] 发送 JSON 解析错误响应失败:', responseErr);
      return;
    }
  }
  
  // Multer 错误处理
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      try {
        return res.status(400).json({
          success: false,
          error: '参数错误',
          message: '文件大小超过限制（最大 5MB）'
        });
      } catch (responseErr) {
        console.error('[Global Error Handler] 发送文件大小错误响应失败:', responseErr);
        return;
      }
    }
    try {
      return res.status(400).json({
        success: false,
        error: '参数错误',
        message: err.message
      });
    } catch (responseErr) {
      console.error('[Global Error Handler] 发送 Multer 错误响应失败:', responseErr);
      return;
    }
  }
  
  // 其他错误
  try {
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  } catch (responseErr) {
    console.error('[Global Error Handler] 发送错误响应失败:', responseErr);
    // 如果发送 JSON 失败，尝试发送纯文本
    if (!res.headersSent) {
      try {
        res.status(500).type('text/plain').send('服务器内部错误');
      } catch (textErr) {
        console.error('[Global Error Handler] 发送纯文本错误响应也失败:', textErr);
      }
    }
  }
});

export default app;
