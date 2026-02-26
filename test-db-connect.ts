// test-db-connect.ts
import { pool } from './src/config/database'; // 请根据实际路径调整

async function testConnection() {
  console.log('🔌 正在尝试连接数据库...');
  try {
    const client = await pool.connect();
    console.log('✅ 数据库连接成功！');
    const res = await client.query('SELECT NOW()');
    console.log('⏰ 数据库当前时间:', res.rows[0].now);
    client.release();
    process.exit(0);
  } catch (err) {
    console.error('❌ 数据库连接失败:', err);
    process.exit(1);
  }
}

testConnection();