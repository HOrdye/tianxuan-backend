import { pool } from '../config/database';

/**
 * 任务服务模块
 * 提供任务查询、完成、领取奖励、初始化等功能
 */

/**
 * 任务状态类型
 */
export type TaskStatus = 'pending' | 'completed' | 'claimed';

/**
 * 任务类型定义
 */
export const TASK_TYPES = [
  'complete_first_chart',      // 定锚本命
  'complete_profile_info',      // 校准心性
  'complete_first_insight',     // 首次推演
  'view_daily_fortune',         // 每日汲气
  'share_profile',              // 分享命盘
  'complete_mbti_test',         // 心性测试
  'recharge_first_time',        // 首次充值
] as const;

export type TaskType = typeof TASK_TYPES[number];

/**
 * 任务奖励配置
 * 注意：应该与前端 TASK_DEFINITIONS 保持一致
 */
export const TASK_REWARDS: Record<TaskType, number> = {
  complete_first_chart: 100,      // 定锚本命：100 天机币
  complete_profile_info: 50,       // 校准心性：50 天机币
  complete_first_insight: 50,     // 首次推演：50 天机币
  view_daily_fortune: 10,         // 每日汲气：10 天机币
  share_profile: 20,               // 分享命盘：20 天机币
  complete_mbti_test: 30,          // 心性测试：30 天机币
  recharge_first_time: 200,       // 首次充值：200 天机币
};

/**
 * 任务接口
 */
export interface UserTask {
  id: string;
  user_id: string;
  task_type: TaskType;
  task_status: TaskStatus;
  completed_at: Date | null;
  claimed_at: Date | null;
  coins_rewarded: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * 完成任务结果接口
 */
export interface CompleteTaskResult {
  task: UserTask;
  alreadyCompleted: boolean;
}

/**
 * 领取奖励结果接口
 */
export interface ClaimRewardResult {
  coinsGranted: number;
  alreadyClaimed: boolean;
}

/**
 * 任务进度接口
 */
export interface TaskProgress {
  total: number;
  completed: number;
  claimed: number;
  progress: number; // 百分比
}

/**
 * 获取用户所有任务状态
 * 
 * @param userId 用户ID
 * @returns Promise<UserTask[]> 任务列表
 */
export async function getUserTasks(userId: string): Promise<UserTask[]> {
  if (!userId) {
    throw new Error('参数错误：用户ID必须有效');
  }

  try {
    const result = await pool.query(
      `SELECT 
        id, user_id, task_type, task_status, completed_at, claimed_at,
        coins_rewarded, created_at, updated_at
      FROM public.user_tasks
      WHERE user_id = $1
      ORDER BY created_at ASC`,
      [userId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      task_type: row.task_type,
      task_status: row.task_status,
      completed_at: row.completed_at,
      claimed_at: row.claimed_at,
      coins_rewarded: row.coins_rewarded || 0,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  } catch (error: any) {
    console.error('获取用户任务失败:', {
      userId,
      error: error.message,
    });
    throw new Error(`获取用户任务失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 完成任务
 * 
 * @param userId 用户ID
 * @param taskType 任务类型
 * @returns Promise<CompleteTaskResult> 完成结果
 */
export async function completeTask(
  userId: string,
  taskType: string
): Promise<CompleteTaskResult> {
  // 参数验证
  if (!userId || !taskType) {
    throw new Error('参数错误：用户ID和任务类型必须有效');
  }

  // 验证任务类型
  if (!TASK_TYPES.includes(taskType as TaskType)) {
    throw new Error(`无效的任务类型: ${taskType}`);
  }

  try {
    // 1. 检查任务是否已存在且已完成
    const existingResult = await pool.query(
      `SELECT * FROM public.user_tasks
       WHERE user_id = $1 AND task_type = $2`,
      [userId, taskType]
    );

    if (existingResult.rows.length > 0) {
      const existing = existingResult.rows[0];
      
      // 如果已经完成，返回已完成的记录
      if (existing.task_status === 'completed' || existing.task_status === 'claimed') {
        return {
          task: {
            id: existing.id,
            user_id: existing.user_id,
            task_type: existing.task_type,
            task_status: existing.task_status,
            completed_at: existing.completed_at,
            claimed_at: existing.claimed_at,
            coins_rewarded: existing.coins_rewarded || 0,
            created_at: existing.created_at,
            updated_at: existing.updated_at,
          },
          alreadyCompleted: true,
        };
      }
    }

    // 2. 使用 UPSERT 操作
    const result = await pool.query(
      `INSERT INTO public.user_tasks (user_id, task_type, task_status, completed_at, updated_at)
       VALUES ($1, $2, 'completed', NOW(), NOW())
       ON CONFLICT (user_id, task_type)
       DO UPDATE SET 
         task_status = 'completed',
         completed_at = NOW(),
         updated_at = NOW()
       RETURNING *`,
      [userId, taskType]
    );

    const task = result.rows[0];

    return {
      task: {
        id: task.id,
        user_id: task.user_id,
        task_type: task.task_type,
        task_status: task.task_status,
        completed_at: task.completed_at,
        claimed_at: task.claimed_at,
        coins_rewarded: task.coins_rewarded || 0,
        created_at: task.created_at,
        updated_at: task.updated_at,
      },
      alreadyCompleted: false,
    };
  } catch (error: any) {
    console.error('完成任务失败:', {
      userId,
      taskType,
      error: error.message,
    });

    // 如果是已知错误，直接抛出
    if (error.message?.includes('参数错误') || error.message?.includes('无效的任务类型')) {
      throw error;
    }

    // 其他错误，包装后抛出
    throw new Error(`完成任务失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 领取任务奖励
 * 
 * @param userId 用户ID
 * @param taskType 任务类型
 * @returns Promise<ClaimRewardResult> 领取结果
 */
export async function claimTaskReward(
  userId: string,
  taskType: string
): Promise<ClaimRewardResult> {
  // 参数验证
  if (!userId || !taskType) {
    throw new Error('参数错误：用户ID和任务类型必须有效');
  }

  // 验证任务类型
  if (!TASK_TYPES.includes(taskType as TaskType)) {
    throw new Error(`无效的任务类型: ${taskType}`);
  }

  // 获取数据库连接（用于事务）
  const client = await pool.connect();

  try {
    // 开始事务
    await client.query('BEGIN');

    // 1. 检查任务是否存在
    const taskResult = await client.query(
      `SELECT * FROM public.user_tasks
       WHERE user_id = $1 AND task_type = $2
       FOR UPDATE`, // 使用行锁防止并发
      [userId, taskType]
    );

    if (taskResult.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new Error('任务不存在，请先完成任务');
    }

    const task = taskResult.rows[0];

    // 2. 检查任务状态是否为 completed
    if (task.task_status !== 'completed') {
      await client.query('ROLLBACK');
      throw new Error('任务尚未完成，无法领取奖励');
    }

    // 3. 检查任务是否已领取
    if (task.task_status === 'claimed') {
      await client.query('ROLLBACK');
      return {
        coinsGranted: task.coins_rewarded || 0,
        alreadyClaimed: true,
      };
    }

    // 4. 获取任务奖励配置
    const reward = TASK_REWARDS[taskType as TaskType] || 0;

    // 5. 如果奖励 > 0，发放天机币
    if (reward > 0) {
      // 直接更新用户余额（活动奖励）
      await client.query(
        `UPDATE public.profiles
         SET tianji_coins_balance = tianji_coins_balance + $1,
             updated_at = NOW()
         WHERE id = $2`,
        [reward, userId]
      );
    }

    // 6. 更新任务状态为 claimed
    await client.query(
      `UPDATE public.user_tasks
       SET 
         task_status = 'claimed',
         claimed_at = NOW(),
         coins_rewarded = $1,
         updated_at = NOW()
       WHERE id = $2`,
      [reward, task.id]
    );

    // 提交事务
    await client.query('COMMIT');

    return {
      coinsGranted: reward,
      alreadyClaimed: false,
    };
  } catch (error: any) {
    // 回滚事务
    await client.query('ROLLBACK');

    console.error('领取任务奖励失败:', {
      userId,
      taskType,
      error: error.message,
    });

    // 如果是已知错误，直接抛出
    if (error.message?.includes('参数错误') || 
        error.message?.includes('无效的任务类型') ||
        error.message?.includes('任务不存在') ||
        error.message?.includes('任务尚未完成') ||
        error.message?.includes('已领取')) {
      throw error;
    }

    // 其他错误，包装后抛出
    throw new Error(`领取任务奖励失败: ${error.message || '未知错误'}`);
  } finally {
    // 释放连接
    client.release();
  }
}

/**
 * 初始化新用户任务
 * 
 * @param userId 用户ID
 * @returns Promise<void>
 */
export async function initializeUserTasks(userId: string): Promise<void> {
  if (!userId) {
    throw new Error('参数错误：用户ID必须有效');
  }

  try {
    // 批量插入所有任务类型，初始状态为 pending
    await pool.query(
      `INSERT INTO public.user_tasks (user_id, task_type, task_status)
       SELECT $1, unnest(ARRAY[
         'complete_first_chart',
         'complete_profile_info',
         'complete_first_insight',
         'view_daily_fortune',
         'share_profile',
         'complete_mbti_test',
         'recharge_first_time'
       ]), 'pending'
       ON CONFLICT (user_id, task_type) DO NOTHING`,
      [userId]
    );
  } catch (error: any) {
    console.error('初始化用户任务失败:', {
      userId,
      error: error.message,
    });
    throw new Error(`初始化用户任务失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 获取任务完成进度
 * 
 * @param userId 用户ID
 * @returns Promise<TaskProgress> 任务进度
 */
export async function getTaskProgress(userId: string): Promise<TaskProgress> {
  if (!userId) {
    throw new Error('参数错误：用户ID必须有效');
  }

  try {
    // 统计已完成和已领取的任务数
    const result = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE task_status IN ('completed', 'claimed')) as completed,
        COUNT(*) FILTER (WHERE task_status = 'claimed') as claimed
      FROM public.user_tasks
      WHERE user_id = $1`,
      [userId]
    );

    const row = result.rows[0];
    const total = TASK_TYPES.length;
    const completed = parseInt(row.completed || '0', 10);
    const claimed = parseInt(row.claimed || '0', 10);
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      claimed,
      progress,
    };
  } catch (error: any) {
    console.error('获取任务进度失败:', {
      userId,
      error: error.message,
    });
    throw new Error(`获取任务进度失败: ${error.message || '未知错误'}`);
  }
}
