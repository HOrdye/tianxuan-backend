import bcrypt from 'bcryptjs';

/**
 * 密码工具模块
 * 提供密码加密和验证功能，兼容 Supabase bcrypt 格式
 */

/**
 * 加密密码
 * 使用 bcryptjs，生成 $2a$ 或 $2b$ 格式的哈希值（兼容 Supabase）
 * 
 * @param password 明文密码
 * @param saltRounds 盐值轮数，默认 10（Supabase 默认也是 10）
 * @returns Promise<string> 加密后的密码哈希值
 */
export async function hashPassword(
  password: string,
  saltRounds: number = 10
): Promise<string> {
  if (!password || password.length === 0) {
    throw new Error('密码不能为空');
  }

  // bcryptjs 默认生成 $2a$ 格式，与 Supabase 兼容
  const hash = await bcrypt.hash(password, saltRounds);
  return hash;
}

/**
 * 验证密码
 * 比较明文密码和加密后的哈希值是否匹配
 * 
 * @param password 明文密码
 * @param hash 加密后的密码哈希值（$2a$ 或 $2b$ 格式）
 * @returns Promise<boolean> 密码是否匹配
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  if (!password || !hash) {
    return false;
  }

  try {
    // bcryptjs 支持 $2a$ 和 $2b$ 格式，完全兼容 Supabase
    const isValid = await bcrypt.compare(password, hash);
    return isValid;
  } catch (error) {
    console.error('密码验证错误:', error);
    return false;
  }
}

/**
 * 检查密码强度
 * 验证密码是否符合安全要求
 * 
 * @param password 明文密码
 * @returns { isValid: boolean, message: string } 验证结果和提示信息
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  message: string;
} {
  if (!password) {
    return { isValid: false, message: '密码不能为空' };
  }

  if (password.length < 8) {
    return { isValid: false, message: '密码长度至少 8 位' };
  }

  if (password.length > 128) {
    return { isValid: false, message: '密码长度不能超过 128 位' };
  }

  // 检查是否包含至少一个字母和一个数字
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasLetter) {
    return { isValid: false, message: '密码必须包含至少一个字母' };
  }

  if (!hasNumber) {
    return { isValid: false, message: '密码必须包含至少一个数字' };
  }

  return { isValid: true, message: '密码强度符合要求' };
}
