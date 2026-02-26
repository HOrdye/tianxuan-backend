import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { Request } from 'express';

/**
 * 文件上传服务
 * 处理头像等文件的上传
 */

// 上传目录配置
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
const AVATAR_DIR = path.join(UPLOAD_DIR, 'avatars');

// 确保上传目录存在
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
if (!fs.existsSync(AVATAR_DIR)) {
  fs.mkdirSync(AVATAR_DIR, { recursive: true });
}

// 允许的文件类型
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * 配置 multer 存储
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, AVATAR_DIR);
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名：uuid + 原始扩展名
    const ext = path.extname(file.originalname);
    const filename = `${randomUUID()}${ext}`;
    cb(null, filename);
  },
});

/**
 * 文件过滤器：只允许图片文件
 */
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback
): void => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    callback(null, true);
  } else {
    callback(new Error(`不支持的文件类型: ${file.mimetype}。仅支持: ${ALLOWED_MIME_TYPES.join(', ')}`));
  }
};

/**
 * Multer 配置
 */
export const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

/**
 * 获取头像 URL
 * 
 * @param filename 文件名
 * @returns 头像 URL
 */
export function getAvatarUrl(filename: string): string {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/uploads/avatars/${filename}`;
}

/**
 * 删除旧头像文件
 * 
 * @param avatarUrl 头像 URL
 */
export function deleteAvatarFile(avatarUrl: string | null): void {
  if (!avatarUrl) {
    return;
  }

  try {
    // 从 URL 中提取文件名
    const filename = path.basename(avatarUrl);
    const filePath = path.join(AVATAR_DIR, filename);
    
    // 检查文件是否存在且在当前上传目录中（安全措施）
    if (fs.existsSync(filePath) && filePath.startsWith(AVATAR_DIR)) {
      fs.unlinkSync(filePath);
      console.log(`[uploadService] 已删除旧头像文件: ${filename}`);
    }
  } catch (error: any) {
    console.error('[uploadService] 删除头像文件失败:', error.message);
    // 不抛出错误，避免影响主流程
  }
}
