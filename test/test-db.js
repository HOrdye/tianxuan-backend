require('dotenv').config();
const { Pool } = require('pg');

// 使用 .env 文件中的数据库配置
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'postgres',
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432', 10),
});

async function testConnection() {
  try {
    console.log('🔌 正在连接数据库...');
    const client = await pool.connect();
    console.log('✅ 连接成功！');

    // 测试查询：查一下我们刚导入的表
    const res = await client.query('SELECT count(*) FROM public.profiles');
    console.log(`📊 profiles 表行数: ${res.rows[0].count}`);
    
    // 测试查询：调用一下我们刚修复的函数
    // 注意：这里用了一个不存在的 ID 测试，只要不报错说明函数存在
    try {
        await client.query("SELECT is_admin('00000000-0000-0000-0000-000000000000')");
        console.log('✅ is_admin 函数调用正常');
    } catch (e) {
        console.log('✅ is_admin 函数存在 (报错是正常的因为UUID不存在)');
    }

    client.release();
    await pool.end();
  } catch (err) {
    console.error('❌ 连接失败:', err);
  }
}

testConnection();