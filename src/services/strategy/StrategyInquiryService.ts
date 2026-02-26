import { pool } from '../../config/database';
import * as coinsService from '../coins.service';
import { callLLM } from '../llm.service';
import { ValidityPeriodCalculator } from './ValidityPeriodCalculator';
import { StrategyPromptGenerator } from './StrategyPromptGenerator';
import type {
  InquiryRequest,
  PaidYiJiItem,
  StrategyAnalysisResult,
  ValidityPeriod,
  TemporalArchive,
} from '../../types/strategy';
import { randomUUID } from 'crypto';

export class StrategyInquiryService {
  private static readonly ACTION_PREFIX_REGEX = /^(建议|适合|可以|可|应当避免|应避免|避免|不要|忌|宜|应当|应该)\s*/;
  private static readonly POSITIVE_WORDS_IN_DONT = ['宜', '适合', '利于', '有利于'];

  static async processInquiry(
    userId: string,
    request: InquiryRequest,
    chart: any,
    isPaid: boolean
  ): Promise<StrategyAnalysisResult> {
    if (!isPaid) {
      return this.generateRuleBasedAnswer(chart, request);
    }

    const deductResult = await coinsService.deductCoins(
      userId,
      'strategy_inquiry',
      10
    );

    if (!deductResult.success) {
      throw new Error(deductResult.message || '扣费失败');
    }

    const validityPeriod = ValidityPeriodCalculator.calculateValidityPeriod(chart);
    
    const userProfile = await this.getUserProfile(userId);

    const routedTemplate = this.resolveTemplateResult(chart, request);
    if (routedTemplate) {
      return this.attachRiskNoteIfNeeded(this.sanitizeYiJiResult(routedTemplate, 'template'), chart);
    }
    
    const prompt = StrategyPromptGenerator.buildUserPrompt(
      chart,
      request.category,
      request,
      validityPeriod,
      userProfile
    );

    const llmResponse = await callLLM({
      prompt,
      systemPrompt: StrategyPromptGenerator.SYSTEM_PROMPT,
      temperature: 0.7,
      maxTokens: 2000,
    });

    const parsed = this.parseStrategyResponse(llmResponse.content);
    const result = this.attachRiskNoteIfNeeded(this.sanitizeYiJiResult(parsed, 'ai-extract'), chart);

    const analysisForArchive: Omit<StrategyAnalysisResult, 'temporalArchive'> = {
      dimension: result.dimension,
      do: result.do,
      dont: result.dont,
      note: result.note,
    };

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const temporalArchive = await this.createTemporalArchive(
        userId,
        request,
        analysisForArchive as StrategyAnalysisResult,
        chart,
        validityPeriod,
        client
      );

      await client.query('COMMIT');

      const finalResult: StrategyAnalysisResult = {
        dimension: result.dimension,
        do: result.do,
        dont: result.dont,
        note: result.note,
        temporalArchive: {
          question: temporalArchive.question,
          category: temporalArchive.category,
          timestamp: temporalArchive.timestamp,
          chartSnapshot: temporalArchive.chartSnapshot,
          analysis: temporalArchive.analysis,
          validityPeriod: temporalArchive.validityPeriod,
        },
      };

      return finalResult;
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('[Strategy Inquiry Service] 保存时空档案失败:', {
        userId,
        error: error.message,
      });
      return result;
    } finally {
      client.release();
    }
  }

  private static async generateRuleBasedAnswer(
    chart: any,
    request: InquiryRequest
  ): Promise<StrategyAnalysisResult> {
    const routedTemplate = this.resolveTemplateResult(chart, request);
    if (routedTemplate) {
      return this.attachRiskNoteIfNeeded(this.sanitizeYiJiResult(routedTemplate, 'template'), chart);
    }

    const fallback: StrategyAnalysisResult = {
      dimension: 'day',
      do: [
        {
          action: '梳理今日优先事项',
          reason: '先定主线再执行，能减少分心与反复。【玄学依据：先立中轴，再取三方】',
          tags: ['职业'],
          priority: 1,
          source: 'legacy',
        },
      ],
      dont: [
        {
          action: '避免冲动承诺',
          reason: '信息未全时贸然应答，后续修正成本更高。【玄学依据：忌星未退，先守后动】',
          tags: ['人际'],
          priority: 1,
          source: 'legacy',
        },
      ],
    };

    return this.attachRiskNoteIfNeeded(fallback, chart);
  }

  private static parseStrategyResponse(content: string): Omit<StrategyAnalysisResult, 'temporalArchive'> {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
      
      return {
        dimension: parsed.dimension === 'year' || parsed.dimension === 'month' || parsed.dimension === 'day'
          ? parsed.dimension
          : 'day',
        do: Array.isArray(parsed.do) ? parsed.do : [],
        dont: Array.isArray(parsed.dont) ? parsed.dont : [],
        note: parsed.note,
      };
    } catch (error: any) {
      console.error('[Strategy Inquiry Service] JSON解析失败:', error);
      return {
        dimension: 'day',
        do: [],
        dont: [],
      };
    }
  }

  private static sanitizeYiJiResult(
    result: Omit<StrategyAnalysisResult, 'temporalArchive'>,
    defaultSource: 'template' | 'ai-extract' | 'legacy'
  ): Omit<StrategyAnalysisResult, 'temporalArchive'> {
    const doList = this.mergeByPrimaryTag(
      (result.do || [])
        .map((item) => this.normalizeItem(item, false, defaultSource))
        .filter((item): item is PaidYiJiItem => Boolean(item))
    );

    const dontList = this.mergeByPrimaryTag(
      (result.dont || [])
        .map((item) => this.normalizeItem(item, true, defaultSource))
        .filter((item): item is PaidYiJiItem => Boolean(item))
    );

    return {
      dimension: result.dimension,
      do: doList.length > 0 ? doList : this.defaultDoFallback(defaultSource),
      dont: dontList.length > 0 ? dontList : this.defaultDontFallback(defaultSource),
      note: this.normalizeNote(result.note),
    };
  }

  private static normalizeItem(
    rawItem: any,
    isDont: boolean,
    defaultSource: 'template' | 'ai-extract' | 'legacy'
  ): PaidYiJiItem | null {
    const rawAction = typeof rawItem?.action === 'string' ? rawItem.action.trim() : '';
    if (!rawAction) {
      return null;
    }

    let action = rawAction.replace(this.ACTION_PREFIX_REGEX, '').trim();
    let reason = typeof rawItem?.reason === 'string' ? rawItem.reason.trim() : '';

    if (action.length > 20) {
      const overflow = action.slice(20).trim();
      action = action.slice(0, 20).trim();
      if (overflow) {
        reason = reason ? `${overflow}。${reason}` : overflow;
      }
    }

    if (!action) {
      return null;
    }

    if (isDont && this.POSITIVE_WORDS_IN_DONT.some((word) => action.includes(word))) {
      console.warn('[Strategy Inquiry Service] 检测到 dont 含正向语义，已丢弃:', action);
      return null;
    }

    if (!reason) {
      reason = '遵循节奏稳步推进，可降低试错成本。';
    }
    if (!/【玄学依据：.+】/.test(reason)) {
      reason = `${reason.replace(/。?$/, '。')}【玄学依据：盘势综合】`;
    }

    const priority = rawItem?.priority === 1 || rawItem?.priority === 2 || rawItem?.priority === 3
      ? rawItem.priority
      : 2;

    const source = rawItem?.source === 'template' || rawItem?.source === 'ai-extract' || rawItem?.source === 'legacy'
      ? rawItem.source
      : defaultSource;

    const tags = Array.isArray(rawItem?.tags)
      ? rawItem.tags
          .map((tag: unknown) => (typeof tag === 'string' ? tag.trim() : ''))
          .filter(Boolean)
          .slice(0, 3)
      : [];

    return {
      action,
      reason,
      tags,
      priority,
      source,
    };
  }

  private static mergeByPrimaryTag(items: PaidYiJiItem[]): PaidYiJiItem[] {
    const grouped = new Map<string, PaidYiJiItem[]>();

    for (const item of items) {
      const key = item.tags && item.tags.length > 0 ? item.tags[0] : `__${item.action}`;
      const existing = grouped.get(key) || [];
      existing.push(item);
      grouped.set(key, existing);
    }

    const merged: PaidYiJiItem[] = [];
    for (const group of grouped.values()) {
      const sorted = [...group].sort((a, b) => (a.priority || 3) - (b.priority || 3));
      const primary = { ...sorted[0] };
      if (sorted.length > 1) {
        const extraReason = sorted
          .slice(1)
          .map((item) => item.reason)
          .filter(Boolean)
          .join('；');
        if (extraReason) {
          primary.reason = `${primary.reason || ''} 此外，也可考虑：${extraReason}`.trim();
        }
      }
      merged.push(primary);
    }

    return merged.sort((a, b) => (a.priority || 3) - (b.priority || 3)).slice(0, 5);
  }

  private static normalizeNote(note: any): StrategyAnalysisResult['note'] {
    if (!note) {
      return undefined;
    }

    const level = note.level === 'danger' ? 'danger' : note.level === 'warning' ? 'warning' : undefined;
    const content = typeof note.content === 'string' ? note.content.trim() : '';

    if (!level || !content) {
      return undefined;
    }

    return { level, content };
  }

  private static attachRiskNoteIfNeeded(
    result: Omit<StrategyAnalysisResult, 'temporalArchive'>,
    chart: any
  ): Omit<StrategyAnalysisResult, 'temporalArchive'> {
    if (result.note || result.dimension !== 'day') {
      return result;
    }

    const serializedChart = JSON.stringify(chart || {});
    const hasRiskStar = serializedChart.includes('天刑') || serializedChart.includes('白虎');
    if (!hasRiskStar) {
      return result;
    }

    return {
      ...result,
      note: {
        level: 'warning',
        content: '流日命中高敏星曜，请优先控制风险并避免高冲突决策。',
      },
    };
  }

  private static resolveTemplateResult(
    chart: any,
    request: InquiryRequest
  ): Omit<StrategyAnalysisResult, 'temporalArchive'> | null {
    const serializedChart = JSON.stringify(chart || {});

    if (serializedChart.includes('命宫') && serializedChart.includes('太阳')) {
      return {
        dimension: 'day',
        do: [
          {
            action: '主动发起关键沟通',
            reason: '先亮立场再谈细节，合作效率更高。【玄学依据：太阳主发散与施予】',
            tags: ['人际'],
            priority: 1,
          },
          {
            action: '公开展示阶段成果',
            reason: '让可见度先行，有助于后续资源匹配。【玄学依据：命宫太阳宜明不宜藏】',
            tags: ['职业'],
            priority: 2,
          },
        ],
        dont: [
          {
            action: '避免独断压制团队',
            reason: '过强主导会削弱协作意愿，影响执行闭环。【玄学依据：阳曜过亢则失衡】',
            tags: ['人际'],
            priority: 1,
          },
        ],
      };
    }

    if (serializedChart.includes('化忌')) {
      return {
        dimension: 'month',
        do: [
          {
            action: '收敛战线聚焦一事',
            reason: '集中资源处理主任务，可显著降低波动。【玄学依据：化忌宜收不宜放】',
            tags: ['职业'],
            priority: 1,
          },
        ],
        dont: [
          {
            action: '避免新增高风险投入',
            reason: '扩张动作与当前盘势逆向，回撤概率升高。【玄学依据：忌象临门先守后攻】',
            tags: ['财务'],
            priority: 1,
          },
        ],
      };
    }

    if (serializedChart.includes('迁移宫') && request.category === 'career') {
      return {
        dimension: 'day',
        do: [
          {
            action: '推进外部合作会谈',
            reason: '走向外部网络更易获得增量信息与机会。【玄学依据：迁移宫动则机缘动】',
            tags: ['职业'],
            priority: 1,
          },
        ],
        dont: [
          {
            action: '避免封闭单点决策',
            reason: '闭门判断会放大信息偏差，影响策略准确度。【玄学依据：迁移受阻则见识受限】',
            tags: ['职业'],
            priority: 2,
          },
        ],
      };
    }

    return null;
  }

  private static defaultDoFallback(source: 'template' | 'ai-extract' | 'legacy'): PaidYiJiItem[] {
    return [
      {
        action: '优先落实一项关键动作',
        reason: '先完成最关键节点，可稳住全天节奏。【玄学依据：先定主轴再扩分支】',
        tags: ['职业'],
        priority: 1,
        source,
      },
    ];
  }

  private static defaultDontFallback(source: 'template' | 'ai-extract' | 'legacy'): PaidYiJiItem[] {
    return [
      {
        action: '避免同时推进多线事项',
        reason: '并行过多会稀释注意力并放大失误率。【玄学依据：气机分散则执行走形】',
        tags: ['职业'],
        priority: 1,
        source,
      },
    ];
  }

  private static async createTemporalArchive(
    userId: string,
    request: InquiryRequest,
    analysis: StrategyAnalysisResult,
    chart: any,
    validityPeriod: ValidityPeriod,
    client: any
  ): Promise<TemporalArchive> {
    const archiveId = randomUUID();
    const question = request.selectedTag || request.customContext;
    const now = new Date().toISOString();

    const analysisSnapshot: Omit<StrategyAnalysisResult, 'temporalArchive'> = {
      dimension: analysis.dimension,
      do: analysis.do,
      dont: analysis.dont,
      note: analysis.note,
    };

    try {
      const queryText = `
        INSERT INTO temporal_archives (
          id, user_id, question, category, 
          chart_snapshot, analysis_result, validity_period, 
          created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
      `;

      const values = [
        archiveId,
        userId,
        question,
        request.category,
        JSON.stringify(chart),
        JSON.stringify(analysisSnapshot),
        JSON.stringify(validityPeriod),
        now,
      ];

      await client.query(queryText, values);

      const chartSnapshot = JSON.parse(JSON.stringify(chart));
      
      return {
        question,
        category: request.category,
        timestamp: now,
        chartSnapshot: chartSnapshot,
        analysis: analysisSnapshot,
        validityPeriod,
      };
    } catch (error: any) {
      console.error('[Strategy Inquiry Service] SQL 写入失败:', error.message);
      throw new Error(`归档失败: ${error.message}`);
    }
  }

  private static async getUserProfile(userId: string): Promise<any> {
    try {
      const result = await pool.query(
        'SELECT preferences FROM profiles WHERE id = $1',
        [userId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0].preferences?.userContext || {};
    } catch (error: any) {
      console.error('[Strategy Inquiry Service] 获取用户档案失败:', error);
      return null;
    }
  }
}
