/**
 * 邮件发送服务模块
 * 提供密码重置邮件发送功能
 * 
 * 注意：此服务支持通过环境变量配置邮件服务
 * 如果未配置邮件服务，将仅记录日志（开发环境）
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * 发送密码重置邮件
 * 
 * @param email 收件人邮箱
 * @param resetToken 密码重置 Token
 * @param resetUrl 密码重置链接（完整URL）
 * @returns Promise<boolean> 发送是否成功
 */
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  resetUrl: string
): Promise<boolean> {
  try {
    // 获取前端基础URL（用于生成重置链接）
    const frontendBaseUrl = process.env.FRONTEND_BASE_URL || process.env.CORS_ORIGIN || 'http://localhost:5173';
    
    // 构建完整的重置链接
    const fullResetUrl = resetUrl || `${frontendBaseUrl}/reset-password?token=${resetToken}`;
    
    // 邮件内容
    const subject = '密码重置请求';
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4a90e2; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
          .button { display: inline-block; padding: 12px 30px; background-color: #4a90e2; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .warning { color: #d9534f; font-size: 14px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>密码重置请求</h1>
          </div>
          <div class="content">
            <p>您好，</p>
            <p>我们收到了您的密码重置请求。请点击下面的按钮来重置您的密码：</p>
            <div style="text-align: center;">
              <a href="${fullResetUrl}" class="button">重置密码</a>
            </div>
            <p>或者复制以下链接到浏览器中打开：</p>
            <p style="word-break: break-all; background-color: #fff; padding: 10px; border-radius: 3px; font-size: 12px;">
              ${fullResetUrl}
            </p>
            <div class="warning">
              <p><strong>重要提示：</strong></p>
              <ul>
                <li>此链接有效期为 1 小时</li>
                <li>如果您没有请求重置密码，请忽略此邮件</li>
                <li>为了您的账户安全，请勿将链接分享给他人</li>
              </ul>
            </div>
          </div>
          <div class="footer">
            <p>此邮件由系统自动发送，请勿回复。</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const textContent = `
密码重置请求

您好，

我们收到了您的密码重置请求。请访问以下链接来重置您的密码：

${fullResetUrl}

重要提示：
- 此链接有效期为 1 小时
- 如果您没有请求重置密码，请忽略此邮件
- 为了您的账户安全，请勿将链接分享给他人

此邮件由系统自动发送，请勿回复。
    `;
    
    // 检查是否配置了邮件服务
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const smtpFrom = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@tianxuan.com';
    
    // 如果配置了邮件服务，使用 nodemailer 发送
    if (smtpHost && smtpPort && smtpUser && smtpPassword) {
      try {
        // 创建邮件传输器
        const transporter: Transporter = nodemailer.createTransport({
          host: smtpHost,
          port: parseInt(smtpPort, 10),
          secure: parseInt(smtpPort, 10) === 465, // 465 端口使用 SSL
          auth: {
            user: smtpUser,
            pass: smtpPassword,
          },
        });
        
        // 发送邮件
        const info = await transporter.sendMail({
          from: smtpFrom,
          to: email,
          subject: subject,
          text: textContent,
          html: htmlContent,
        });
        
        console.log('✅ 密码重置邮件已发送:', {
          messageId: info.messageId,
          to: email,
          resetUrl: fullResetUrl,
        });
        
        return true;
      } catch (error: any) {
        console.error('❌ 邮件发送失败:', error.message);
        // 如果邮件发送失败，继续使用日志模式
        console.warn('⚠️  邮件服务发送失败，将使用日志模式');
        console.error('错误详情:', error);
      }
    }
    
    // 开发环境或未配置邮件服务时，仅记录日志
    console.log('📧 [邮件服务 - 日志模式] 密码重置邮件');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('收件人:', email);
    console.log('主题:', subject);
    console.log('重置链接:', fullResetUrl);
    console.log('Token:', resetToken);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('提示: 在生产环境中，请配置 SMTP 服务以发送真实邮件');
    console.log('环境变量配置示例:');
    console.log('  SMTP_HOST=smtp.example.com');
    console.log('  SMTP_PORT=587');
    console.log('  SMTP_USER=your-email@example.com');
    console.log('  SMTP_PASSWORD=your-password');
    console.log('  SMTP_FROM=noreply@example.com');
    console.log('  FRONTEND_BASE_URL=https://your-domain.com');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // 在开发环境中，返回 true 表示"发送成功"（实际只是记录了日志）
    // 在生产环境中，如果未配置邮件服务，应该返回 false 或抛出错误
    const isDevelopment = process.env.NODE_ENV !== 'production';
    return isDevelopment; // 开发环境返回 true，生产环境如果未配置则返回 false
  } catch (error: any) {
    console.error('❌ 发送密码重置邮件时发生错误:', error);
    return false;
  }
}
