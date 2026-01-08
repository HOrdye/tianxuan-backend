import { Request, Response, NextFunction } from 'express';
import { verifyToken as verifyJwtToken, TokenPayload } from '../services/auth.service';

/**
 * 认证中间件
 * 从请求头提取 Token，验证有效性，并将用户信息附加到请求对象
 */

/**
 * 扩展 Express Request 类型，添加 user 属性
 */
export interface AuthRequest extends Request {
  user?: TokenPayload;
}

/**
 * 认证中间件函数
 * 从 Authorization 头提取 Bearer Token，验证并附加用户信息
 * 
 * @param req Express 请求对象
 * @param res Express 响应对象
 * @param next Express 下一个中间件函数
 */
export async function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 从请求头获取 Authorization
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
      res.status(401).json({
        error: '未提供认证令牌',
        message: '请在请求头中添加 Authorization: Bearer <token>',
      });
      return;
    }

    // 提取 Token（格式：Bearer <token>）
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({
        error: '认证令牌格式错误',
        message: 'Token 格式应为: Bearer <token>',
      });
      return;
    }

    const token = parts[1];

    if (!token) {
      res.status(401).json({
        error: '认证令牌为空',
        message: '请在 Bearer 后提供有效的 Token',
      });
      return;
    }

    // 验证 Token
    const decoded = await verifyJwtToken(token);

    // 将用户信息附加到请求对象
    req.user = decoded;

    // 继续处理请求
    next();
  } catch (error: any) {
    // Token 验证失败
    const statusCode = error.message.includes('过期') ? 401 : 403;
    res.status(statusCode).json({
      error: '认证失败',
      message: error.message || 'Token 验证失败',
    });
  }
}

/**
 * 可选的认证中间件（不强制要求 Token）
 * 如果提供了 Token 则验证，否则继续处理（req.user 为 undefined）
 * 
 * @param req Express 请求对象
 * @param res Express 响应对象
 * @param next Express 下一个中间件函数
 */
export async function optionalAuthenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers['authorization'];

    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        const token = parts[1];
        if (token) {
          try {
            const decoded = await verifyJwtToken(token);
            req.user = decoded;
          } catch (error) {
            // Token 无效，但不阻止请求继续
            req.user = undefined;
          }
        }
      }
    }

    next();
  } catch (error) {
    // 发生错误，但不阻止请求继续
    next();
  }
}
