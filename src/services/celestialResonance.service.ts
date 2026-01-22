import { pool } from '../config/database';
import {
  CalibrationData,
  ResonanceParams,
  ManifestationData,
  ZiweiLiudayData,
  DecodingData,
  CelestialResonanceRecord,
  ImageryWord,
} from '../types/celestial-resonance';
import * as astrologyService from './astrology.service';
import * as llmService from './llm.service';
import * as coinsService from './coins.service';
import { randomBytes } from 'crypto';

/**
 * 天感·今日气象服务模块
 * 提供定念、共振、显化、解码等功能
 */

/**
 * 计算共振参数
 * 
 * @param userId 用户ID
 * @param profileId 档案ID
 * @param calibrationData 定念数据
 * @returns Promise<ResonanceParams> 共振参数
 */
export async function calculateResonanceParams(
  userId: string,
  profileId: string,
  calibrationData: CalibrationData
): Promise<ResonanceParams> {
  // 1. 获取紫微流日数据
  const ziweiData = await getZiweiLiudayData(userId, profileId);
  
  // 2. 生成随机种子（基于定念数据）
  const randomSeed = generateRandomSeed(calibrationData);
  
  // 3. 计算粒子参数（基于紫微数据）
  const particleConfig = calculateParticleConfig(ziweiData);
  
  // 4. 计算Shader参数（基于紫微数据）
  const shaderParams = calculateShaderParams(ziweiData);
  
  return { randomSeed, particleConfig, shaderParams };
}

/**
 * 生成显化数据
 * 
 * @param userId 用户ID
 * @param profileId 档案ID
 * @param resonanceParams 共振参数
 * @returns Promise<ManifestationData> 显化数据
 */
export async function generateManifestation(
  userId: string,
  profileId: string,
  resonanceParams: ResonanceParams
): Promise<ManifestationData> {
  // 1. 获取紫微流日数据
  const ziweiData = await getZiweiLiudayData(userId, profileId);
  
  // 2. 匹配关键词
  const keywords = await getMatchingWords(ziweiData, 5);
  
  // 3. 提取核心字
  const coreWord = extractCoreWord(ziweiData, keywords);
  
  // 4. 生成海报（TODO: 调用图像生成服务）
  const imageUrl = await generatePosterImage(keywords, coreWord, resonanceParams);
  const videoUrl = undefined; // TODO: 生成动态视频
  
  // 5. 计算布局（黄金分割气眼位置）
  const layout = calculateLayout(keywords, coreWord);
  
  return { keywords, coreWord, imageUrl, videoUrl, layout };
}

/**
 * 生成解码数据（免费内容）
 * 
 * @param recordId 记录ID
 * @returns Promise<DecodingData> 解码数据
 */
export async function generateDecoding(
  recordId: string
): Promise<DecodingData> {
  // 1. 获取记录数据
  const record = await getRecord(recordId);
  
  if (!record) {
    throw new Error('记录不存在');
  }
  
  // 2. 调用AI生成解读（使用现有的LLM服务）
  const llmResponse = await llmService.callLLM({
    prompt: `请根据以下紫微流日数据，生成今日气象的专业解读：
主星：${record.ziweiLiudayData.mainStar}
四化：${record.ziweiLiudayData.transformations.join(', ')}
五行：${record.ziweiLiudayData.element}
状态：${record.ziweiLiudayData.state}
核心字：${record.manifestationData.coreWord}
关键词：${record.manifestationData.keywords.join(', ')}
请用专业但易懂的语言解释今日气象的含义。`,
    temperature: 0.7,
  });
  const explanation = llmResponse.content;
  
  // 3. 提取命理原因
  const astrologicalReason = extractAstrologicalReason(record);
  
  // 4. 生成警告和建议
  const { warnings, suggestions } = await generateWarningsAndSuggestions(record);
  
  return { explanation, astrologicalReason, warnings, suggestions };
}

/**
 * 保存天感记录
 * 
 * @param userId 用户ID
 * @param profileId 档案ID
 * @param resonanceDate 共振日期（YYYY-MM-DD）
 * @param calibrationData 定念数据
 * @param resonanceParams 共振参数
 * @param manifestationData 显化数据
 * @param ziweiLiudayData 紫微流日数据
 * @returns Promise<string> 记录ID
 */
export async function saveResonanceRecord(
  userId: string,
  profileId: string,
  resonanceDate: string,
  calibrationData: CalibrationData,
  resonanceParams: ResonanceParams,
  manifestationData: ManifestationData,
  ziweiLiudayData: ZiweiLiudayData
): Promise<string> {
  try {
    const result = await pool.query(
      `INSERT INTO public.celestial_resonance_records (
        user_id,
        profile_id,
        resonance_date,
        calibration_data,
        resonance_params,
        manifestation_data,
        ziwei_liuday_data,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3::date, $4, $5, $6, $7, NOW(), NOW())
      ON CONFLICT (user_id, profile_id, resonance_date)
      DO UPDATE SET
        calibration_data = EXCLUDED.calibration_data,
        resonance_params = EXCLUDED.resonance_params,
        manifestation_data = EXCLUDED.manifestation_data,
        ziwei_liuday_data = EXCLUDED.ziwei_liuday_data,
        updated_at = NOW()
      RETURNING id`,
      [
        userId,
        profileId,
        resonanceDate,
        JSON.stringify(calibrationData),
        JSON.stringify(resonanceParams),
        JSON.stringify(manifestationData),
        JSON.stringify(ziweiLiudayData),
      ]
    );
    
    return result.rows[0].id;
  } catch (error: any) {
    console.error('保存天感记录失败:', error);
    throw new Error(`保存天感记录失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 获取天感记录
 * 
 * @param recordId 记录ID
 * @returns Promise<CelestialResonanceRecord | null> 记录或 null
 */
export async function getRecord(recordId: string): Promise<CelestialResonanceRecord | null> {
  try {
    const result = await pool.query(
      `SELECT 
        id,
        user_id,
        profile_id,
        resonance_date,
        calibration_data,
        resonance_params,
        manifestation_data,
        ziwei_liuday_data,
        decoding_data,
        is_decoded,
        decoded_at,
        created_at,
        updated_at
      FROM public.celestial_resonance_records
      WHERE id = $1`,
      [recordId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      profileId: row.profile_id,
      resonanceDate: row.resonance_date.toISOString().split('T')[0],
      calibrationData: typeof row.calibration_data === 'string' 
        ? JSON.parse(row.calibration_data) 
        : row.calibration_data,
      resonanceParams: typeof row.resonance_params === 'string'
        ? JSON.parse(row.resonance_params)
        : row.resonance_params,
      manifestationData: typeof row.manifestation_data === 'string'
        ? JSON.parse(row.manifestation_data)
        : row.manifestation_data,
      ziweiLiudayData: typeof row.ziwei_liuday_data === 'string'
        ? JSON.parse(row.ziwei_liuday_data)
        : row.ziwei_liuday_data,
      decodingData: row.decoding_data 
        ? (typeof row.decoding_data === 'string' 
            ? JSON.parse(row.decoding_data) 
            : row.decoding_data)
        : undefined,
      isDecoded: row.is_decoded || false,
      decodedAt: row.decoded_at ? row.decoded_at.toISOString() : undefined,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  } catch (error: any) {
    console.error('获取天感记录失败:', error);
    throw new Error(`获取天感记录失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 获取今日天感记录
 * 
 * @param userId 用户ID
 * @param profileId 档案ID
 * @param date 日期（YYYY-MM-DD，可选，默认今天）
 * @returns Promise<CelestialResonanceRecord | null> 记录或 null
 */
export async function getTodayRecord(
  userId: string,
  profileId: string,
  date?: string
): Promise<CelestialResonanceRecord | null> {
  const resonanceDate = date || new Date().toISOString().split('T')[0];
  
  try {
    const result = await pool.query(
      `SELECT 
        id,
        user_id,
        profile_id,
        resonance_date,
        calibration_data,
        resonance_params,
        manifestation_data,
        ziwei_liuday_data,
        decoding_data,
        is_decoded,
        decoded_at,
        created_at,
        updated_at
      FROM public.celestial_resonance_records
      WHERE user_id = $1 
        AND profile_id = $2 
        AND resonance_date = $3::date
      LIMIT 1`,
      [userId, profileId, resonanceDate]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      profileId: row.profile_id,
      resonanceDate: row.resonance_date.toISOString().split('T')[0],
      calibrationData: typeof row.calibration_data === 'string' 
        ? JSON.parse(row.calibration_data) 
        : row.calibration_data,
      resonanceParams: typeof row.resonance_params === 'string'
        ? JSON.parse(row.resonance_params)
        : row.resonance_params,
      manifestationData: typeof row.manifestation_data === 'string'
        ? JSON.parse(row.manifestation_data)
        : row.manifestation_data,
      ziweiLiudayData: typeof row.ziwei_liuday_data === 'string'
        ? JSON.parse(row.ziwei_liuday_data)
        : row.ziwei_liuday_data,
      decodingData: row.decoding_data 
        ? (typeof row.decoding_data === 'string' 
            ? JSON.parse(row.decoding_data) 
            : row.decoding_data)
        : undefined,
      isDecoded: row.is_decoded || false,
      decodedAt: row.decoded_at ? row.decoded_at.toISOString() : undefined,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  } catch (error: any) {
    console.error('获取今日天感记录失败:', error);
    throw new Error(`获取今日天感记录失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 保存解码数据（付费后）
 * 
 * @param recordId 记录ID
 * @param decodingData 解码数据
 * @returns Promise<void>
 */
export async function saveDecodingData(
  recordId: string,
  decodingData: DecodingData
): Promise<void> {
  try {
    await pool.query(
      `UPDATE public.celestial_resonance_records
      SET 
        decoding_data = $1,
        is_decoded = TRUE,
        decoded_at = NOW(),
        updated_at = NOW()
      WHERE id = $2`,
      [JSON.stringify(decodingData), recordId]
    );
  } catch (error: any) {
    console.error('保存解码数据失败:', error);
    throw new Error(`保存解码数据失败: ${error.message || '未知错误'}`);
  }
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 获取紫微流日数据（公开函数，供外部调用）
 * 
 * @param userId 用户ID
 * @param profileId 档案ID
 * @returns Promise<ZiweiLiudayData> 紫微流日数据
 */
export async function getZiweiLiudayData(
  userId: string,
  profileId: string
): Promise<ZiweiLiudayData> {
  // TODO: 调用紫微流日计算服务
  // 当前返回简化版数据
  return {
    mainStar: '紫微',
    transformations: ['化科', '化权'],
    palaces: {},
    element: 'fire',
    state: 'change',
  };
}

/**
 * 生成随机种子
 */
function generateRandomSeed(calibrationData: CalibrationData): string {
  const seed = `${calibrationData.duration}-${calibrationData.timestamp}-${calibrationData.mouseTrajectory.join(',')}`;
  return Buffer.from(seed).toString('base64').substring(0, 32);
}

/**
 * 计算粒子配置
 */
function calculateParticleConfig(ziweiData: ZiweiLiudayData): ResonanceParams['particleConfig'] {
  // 根据五行属性确定颜色和流动方向
  const colorMap: Record<string, string> = {
    fire: '#FF6B6B',    // 金红色
    water: '#4ECDC4',   // 墨蓝色
    wood: '#95E1D3',    // 翠绿色
    metal: '#F7DC6F',   // 银白色
    earth: '#D4A574',   // 土黄色
  };
  
  const flowDirectionMap: Record<string, 'up' | 'down' | 'spiral' | 'ripple'> = {
    fire: 'up',
    water: 'ripple',
    wood: 'up',
    metal: 'spiral',
    earth: 'down',
  };
  
  return {
    count: 100,
    color: colorMap[ziweiData.element] || '#FF6B6B',
    flowDirection: flowDirectionMap[ziweiData.element] || 'up',
    speed: 1.0,
  };
}

/**
 * 计算Shader参数
 */
function calculateShaderParams(ziweiData: ZiweiLiudayData): ResonanceParams['shaderParams'] {
  // 根据状态确定参数
  const intensityMap: Record<string, number> = {
    change: 0.8,
    stagnant: 0.3,
    rising: 1.0,
    falling: 0.5,
  };
  
  return {
    blurRadius: 5,
    intensity: intensityMap[ziweiData.state] || 0.5,
    turbulence: ziweiData.state === 'change' ? 0.7 : 0.3,
  };
}

/**
 * 获取匹配的关键词
 */
async function getMatchingWords(
  ziweiData: ZiweiLiudayData,
  count: number = 5
): Promise<string[]> {
  try {
    // 映射状态到分类
    const categoryMap: Record<string, string> = {
      change: '变动',
      stagnant: '停滞',
      rising: '上升',
      falling: '下降',
    };
    
    // 映射五行
    const elementMap: Record<string, string> = {
      fire: '火',
      water: '水',
      wood: '木',
      metal: '金',
      earth: '土',
    };
    
    const category = categoryMap[ziweiData.state] || '变动';
    const element = elementMap[ziweiData.element] || '火';
    
    const result = await pool.query(
      `SELECT word
      FROM public.imagery_word_library
      WHERE category = $1 AND element = $2
      ORDER BY intensity DESC, usage_count DESC, RANDOM()
      LIMIT $3`,
      [category, element, count]
    );
    
    // 更新使用次数
    if (result.rows.length > 0) {
      const words = result.rows.map((row) => row.word);
      await pool.query(
        `UPDATE public.imagery_word_library
        SET usage_count = usage_count + 1,
            updated_at = NOW()
        WHERE word = ANY($1)`,
        [words]
      );
      return words;
    }
    
    // 如果没有匹配的，返回默认词汇
    return ['潜龙', '破壁', '微澜', '归元', '蓄力'];
  } catch (error: any) {
    console.error('获取匹配关键词失败:', error);
    // 降级方案：返回默认词汇
    return ['潜龙', '破壁', '微澜', '归元', '蓄力'];
  }
}

/**
 * 提取核心字
 */
function extractCoreWord(ziweiData: ZiweiLiudayData, keywords: string[]): string {
  // 根据主星映射核心字
  const coreWordMap: Record<string, string> = {
    '紫微': '通',
    '天机': '变',
    '太阳': '明',
    '武曲': '坚',
    '天同': '和',
    '廉贞': '正',
    '天府': '稳',
    '太阴': '柔',
    '贪狼': '欲',
    '巨门': '暗',
    '天相': '辅',
    '天梁': '荫',
    '七杀': '破',
    '破军': '动',
  };
  
  return coreWordMap[ziweiData.mainStar] || keywords[0] || '通';
}

/**
 * 生成海报图像（TODO: 实现图像生成）
 */
async function generatePosterImage(
  keywords: string[],
  coreWord: string,
  resonanceParams: ResonanceParams
): Promise<string> {
  // TODO: 实现图像生成逻辑
  // 当前返回占位符URL
  return `/api/celestial-resonance/poster/${Date.now()}.png`;
}

/**
 * 计算布局（黄金分割气眼位置）
 */
function calculateLayout(
  keywords: string[],
  coreWord: string
): ManifestationData['layout'] {
  // 黄金分割比例
  const goldenRatio = 0.618;
  const width = 1920;
  const height = 1080;
  
  // 核心字位置（中心偏上）
  const coreWordPosition = {
    x: width / 2,
    y: height * goldenRatio,
  };
  
  // 关键词位置（围绕核心字，黄金分割点）
  const keywordPositions = keywords.map((word, index) => {
    const angle = (index / keywords.length) * Math.PI * 2;
    const radius = Math.min(width, height) * 0.3;
    return {
      word,
      x: coreWordPosition.x + Math.cos(angle) * radius,
      y: coreWordPosition.y + Math.sin(angle) * radius,
    };
  });
  
  return {
    coreWordPosition,
    keywordPositions,
  };
}

/**
 * 提取命理原因
 */
function extractAstrologicalReason(record: CelestialResonanceRecord): string {
  const { ziweiLiudayData, manifestationData } = record;
  
  return `因流日${ziweiLiudayData.mainStar}${ziweiLiudayData.transformations.join('、')}入命，且定念与${ziweiLiudayData.element}气相合。此象主：${manifestationData.coreWord}。`;
}

/**
 * 生成警告和建议
 */
async function generateWarningsAndSuggestions(
  record: CelestialResonanceRecord
): Promise<{ warnings: string[]; suggestions: string[] }> {
  const { ziweiLiudayData } = record;
  
  // 根据四化生成警告
  const warnings: string[] = [];
  if (ziweiLiudayData.transformations.includes('化忌')) {
    warnings.push('警惕化忌，午后言多必失，宜闭嘴做事');
  }
  
  // 根据状态生成建议
  const suggestions: string[] = [];
  if (ziweiLiudayData.state === 'rising') {
    suggestions.push('今日宜主动出击，把握上升机遇');
  } else if (ziweiLiudayData.state === 'stagnant') {
    suggestions.push('今日宜静观其变，蓄力待发');
  }
  
  return { warnings, suggestions };
}
