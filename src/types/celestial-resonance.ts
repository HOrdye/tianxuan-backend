/**
 * 天感·今日气象（Celestial Resonance）类型定义
 * 创建时间: 2026-01-15
 */

/**
 * 定念数据（用户输入）
 */
export interface CalibrationData {
  duration: number;              // 按压时长（毫秒）
  mouseTrajectory: number[];      // 鼠标轨迹（归一化坐标）
  timestamp: string;             // 时间戳
  hour: number;                  // 时辰（0-23）
}

/**
 * 共振参数（生成参数）
 */
export interface ResonanceParams {
  randomSeed: string;            // 随机种子
  particleConfig: {
    count: number;               // 粒子数量
    color: string;               // 主色调
    flowDirection: 'up' | 'down' | 'spiral' | 'ripple';
    speed: number;               // 流动速度
  };
  shaderParams: {
    blurRadius: number;          // 模糊半径
    intensity: number;           // 强度
    turbulence: number;          // 湍流
  };
}

/**
 * 显化结果（最终输出）
 */
export interface ManifestationData {
  keywords: string[];            // 关键词列表（3-5个）
  coreWord: string;              // 核心字
  imageUrl: string;              // 静态海报URL
  videoUrl?: string;             // 动态视频URL（可选）
  layout: {
    coreWordPosition: { x: number; y: number };
    keywordPositions: Array<{ word: string; x: number; y: number }>;
  };
}

/**
 * 紫微流日数据
 */
export interface ZiweiLiudayData {
  mainStar: string;              // 流日命宫主星
  transformations: string[];     // 四化
  palaces: Record<string, any>;  // 三方四正数据
  element: 'fire' | 'water' | 'wood' | 'metal' | 'earth';
  state: 'change' | 'stagnant' | 'rising' | 'falling';
}

/**
 * 解码数据（付费内容）
 */
export interface DecodingData {
  explanation: string;           // 整体解释
  astrologicalReason: string;    // 命理原因
  warnings: string[];            // 注意事项
  suggestions: string[];         // 建议
}

/**
 * 天感记录（完整记录）
 */
export interface CelestialResonanceRecord {
  id: string;
  userId: string;
  profileId: string;
  resonanceDate: string;         // YYYY-MM-DD 格式
  calibrationData: CalibrationData;
  resonanceParams: ResonanceParams;
  manifestationData: ManifestationData;
  ziweiLiudayData: ZiweiLiudayData;
  decodingData?: DecodingData;
  isDecoded: boolean;
  decodedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 意象词汇
 */
export interface ImageryWord {
  id: string;
  word: string;                  // 词汇本身
  category: '变动' | '停滞' | '上升' | '下降';
  element: '火' | '水' | '木' | '金' | '土';
  intensity: number;             // 强度：1-5
  meaning: string;               // 含义说明
  usageCount: number;            // 使用次数
  createdAt: string;
  updatedAt: string;
}
