import pg from 'pg';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const { Pool } = pg;

// 创建全局连接池
export const pool = new Pool({
  // 使用 .env 中的配置，或者回退到默认值
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'postgres',
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  
  // 连接池配置
  max: 20, // 最大连接数
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// 监听连接事件 (可选，用于调试)
pool.on('connect', () => {
  // console.log('🔌 数据库连接池已建立新连接');
});

pool.on('error', (err) => {
  console.error('❌ 数据库连接池发生意外错误:', err);
  process.exit(-1);
});

// ✅ 封装一个带超时的查询函数
export async function queryWithTimeout<T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[],
  timeoutMs: number = 5000
): Promise<pg.QueryResult<T>> {
  return Promise.race([
    pool.query<T>(text, params),
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`数据库查询超时 (${timeoutMs}ms)`));
      }, timeoutMs);
    }),
  ]);
}

// ✅ 封装一个健康检查函数
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const start = Date.now();
    await queryWithTimeout('SELECT 1', [], 2000); // 2秒超时
    const duration = Date.now() - start;
    console.log(`💓 数据库心跳正常 (${duration}ms)`);
    return true;
  } catch (error) {
    console.error('💔 数据库心跳失败:', error);
    return false;
  }
}
