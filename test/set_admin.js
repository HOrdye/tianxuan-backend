#!/usr/bin/env node

/**
 * 设置管理员角色脚本
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'tianxuan',
  user: process.env.DB_USER || 'tianxuan',
  password: process.env.DB_PASSWORD,
});

async function setAdmin() {
  const email = process.argv[2] || 'admin@example.com';
  
  try {
    console.log(`正在将 ${email} 设置为管理员...`);
    
    const result = await pool.query(
      `UPDATE public.profiles 
       SET role = 'admin' 
       WHERE email = $1
       RETURNING id, email, role`,
      [email]
    );
    
    if (result.rows.length === 0) {
      console.log(`❌ 未找到邮箱为 ${email} 的用户`);
      process.exit(1);
    }
    
    const user = result.rows[0];
    console.log(`✅ 成功设置管理员:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   邮箱: ${user.email}`);
    console.log(`   角色: ${user.role}`);
    
    // 验证 is_admin 函数
    const adminCheck = await pool.query(
      'SELECT is_admin($1) as is_admin',
      [user.id]
    );
    
    console.log(`\n🔍 验证 is_admin() 函数:`);
    console.log(`   is_admin(${user.id}) = ${adminCheck.rows[0].is_admin}`);
    
    if (adminCheck.rows[0].is_admin) {
      console.log(`✅ 管理员权限验证通过！`);
    } else {
      console.log(`⚠️  警告: is_admin() 函数返回 false，请检查数据库函数`);
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ 设置管理员失败:', error.message);
    process.exit(1);
  }
}

setAdmin();
