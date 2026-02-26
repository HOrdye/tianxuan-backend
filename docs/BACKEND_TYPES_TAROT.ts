/**
 * 塔罗占卜 API TypeScript 类型定义
 * 
 * 版本: v2.1 Final
 * 创建时间: 2026-01-26
 * 
 * 使用方法：
 * 1. 复制此文件到前端项目的 types 目录
 * 2. 或直接导入使用
 */

/**
 * 塔罗意图类型
 */
export type TarotIntent = 
  | 'relationship'   // 关系型（如"能复合吗？"、"他爱我吗？"）
  | 'decision'       // 决策型（如"该不该离职？"、"选A还是选B？"）
  | 'prediction'     // 预测型（如"能通过考试吗？"、"项目会成吗？"）
  | 'exploration';   // 探索型（如"为什么最近倒霉？"、"我该怎么提升？"）

/**
 * 直断字段（v2.1 New）
 */
export interface TarotDirectAnswer {
  /** 直接回答（如"不能复合"、"建议选择A"） */
  verdict: string;
  /** 语气类型 */
  tone: 'gentle' | 'neutral' | 'direct';
  /** 缓冲版本（如"目前来看，复合的可能性很低"） */
  buffered_version: string;
}

/**
 * 能量定性（v2.1 Final）
 */
export interface TarotEnergyAssessment {
  /** 当前能量状态 */
  current_state: '阻滞' | '顺畅' | '波动';
  /** 能量趋势 */
  trend: 'improving' | 'stable' | 'declining';
  /** 能量维度 */
  dimension: 'overall' | 'emotional' | 'practical' | 'spiritual';
  /** 能量状态的文字描述 */
  description: string;
}

/**
 * 运势阶段（v2.2 New）
 */
export interface TarotFortuneStage {
  /** 阶段名称（如"蛰伏转型期"、"蓄势待发"） */
  stage_name: string;
  /** 阶段描述（如"短期面临内耗，长期指向技术壁垒构建"） */
  stage_description: string;
  /** 吉凶趋势（如"短期阻滞，长期顺畅"） */
  trend: '短期阻滞，长期顺畅' | '短期顺畅，长期阻滞' | '整体顺畅' | '整体阻滞' | '波动中上升' | '波动中下降';
}

/**
 * 灵视定调（第一屏）
 */
export interface TarotVerdict {
  /** 直断字段（v2.1 New） */
  direct_answer: TarotDirectAnswer;
  /** 核心牌名称（如"The Tower"） */
  core_card: string;
  /** 能量等级（v2.1 Final）- 使用等级制，替代精确分数 */
  energy_level: 'low' | 'medium' | 'high';
  /** 能量标签（用于前端显示，如"复合概率"、"通过概率"） */
  energy_label: string;
  /** 标题（4-8字，极具冲击力） */
  headline: string;
  /** 总结（包含"结论" + "能量定性"） */
  summary: string;
  /** 能量定性（v2.1 Final） */
  energy_assessment: TarotEnergyAssessment;
  /** 运势阶段（v2.2 New） */
  fortune_stage?: TarotFortuneStage;
}

/**
 * 牌阵中的卡牌
 */
export interface TarotCard {
  /** 位置（如"过去"、"现在"、"未来"） */
  position: string;
  /** 牌名称（如"The Tower"） */
  card: string;
  /** 连接类型（用于前端连线颜色） */
  connection_type: 'support' | 'conflict' | 'neutral';
  /** 情境化解读（结合问题+位置） */
  contextual_meaning: string;
}

/**
 * 微仪式步骤
 */
export interface TarotSoulActionStep {
  /** 步骤序号 */
  step: number;
  /** 动作描述 */
  action: string;
  /** 预计耗时 */
  duration: string;
  /** 所需物品 */
  items: string[];
  /** 能量意义 */
  energy_meaning: string;
}

/**
 * 灵魂行动（第三屏）- 微仪式
 */
export interface TarotSoulAction {
  /** 仪式标题 */
  title: string;
  /** 极简版（30秒，默认显示） */
  simple_version: {
    action: string;
    duration: string;
  };
  /** 完整版（15分钟，点击查看） */
  full_version: {
    steps: TarotSoulActionStep[];
  };
}

/**
 * 塔罗解读结果（完整）
 */
export interface TarotResult {
  /** 意图类型 */
  intent: TarotIntent;
  /** 灵视定调（第一屏） */
  verdict: TarotVerdict;
  /** 牌阵矩阵（第二屏） */
  card_matrix: TarotCard[];
  /** 灵魂行动（第三屏） */
  soul_action: TarotSoulAction;
}

/**
 * API统一响应格式
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * 生成塔罗解读请求
 */
export interface TarotReadingRequest {
  /** 用户问题（必填，1-500字符） */
  question: string;
}

/**
 * 生成塔罗解读响应
 */
export type TarotReadingResponse = ApiResponse<TarotResult>;

/**
 * 工具函数：根据tone字段获取显示文本
 */
export function getDisplayDirectAnswer(directAnswer: TarotDirectAnswer): string {
  return directAnswer.tone === 'gentle' 
    ? directAnswer.buffered_version 
    : directAnswer.verdict;
}

/**
 * 工具函数：将能量等级映射为百分比
 */
export function getEnergyPercentage(energyLevel: 'low' | 'medium' | 'high'): number {
  const map: Record<string, number> = {
    'low': 30,
    'medium': 60,
    'high': 85
  };
  return map[energyLevel] || 50;
}

/**
 * 工具函数：获取能量状态颜色
 */
export function getEnergyStateColor(state: '阻滞' | '顺畅' | '波动'): string {
  const map: Record<string, string> = {
    '阻滞': '#ef4444',
    '顺畅': '#22c55e',
    '波动': '#eab308'
  };
  return map[state] || '#6b7280';
}

/**
 * 工具函数：获取趋势文本
 */
export function getTrendText(trend: 'improving' | 'stable' | 'declining'): string {
  const map: Record<string, string> = {
    'improving': '上升',
    'stable': '稳定',
    'declining': '下降'
  };
  return map[trend] || trend;
}

/**
 * 工具函数：获取连接类型颜色
 */
export function getConnectionTypeColor(type: 'support' | 'conflict' | 'neutral'): string {
  const map: Record<string, string> = {
    'support': '#fbbf24',  // 金色
    'conflict': '#ef4444', // 红色
    'neutral': '#6b7280'   // 灰色
  };
  return map[type] || '#6b7280';
}
