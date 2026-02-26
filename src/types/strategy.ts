export type ScenarioType = 'career' | 'love' | 'wealth' | 'health' | 'family' | 'education' | 'other';

export interface InquiryData {
  category: ScenarioType;
  selectedTag?: string;
  customContext: string;
}

export interface ValidityPeriod {
  startDate: string;
  endDate: string;
  urgency: 'high' | 'medium' | 'low';
}

export interface PalaceAnalysis {
  palaceName: string;
  palacePosition: string;
  analysis: string;
  keyStars: string[];
}

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export type PaidYiJiPriority = 1 | 2 | 3;

export interface PaidYiJiItem {
  action: string;
  reason?: string;
  tags?: string[];
  priority?: PaidYiJiPriority;
  source?: 'template' | 'ai-extract' | 'legacy';
}

export interface PaidYiJiNote {
  level: 'warning' | 'danger';
  content: string;
}

export interface StrategyAnalysisResult {
  dimension: 'year' | 'month' | 'day';
  do: PaidYiJiItem[];
  dont: PaidYiJiItem[];
  note?: PaidYiJiNote;
  temporalArchive?: TemporalArchive;
}

export interface TimingRecommendation {
  type: 'year' | 'month' | 'day';
  period: string;
  suggestion: string;
}

export interface TemporalArchive {
  question: string;
  category: ScenarioType;
  timestamp: string;
  chartSnapshot: any;
  analysis: Omit<StrategyAnalysisResult, 'temporalArchive'>;
  validityPeriod: ValidityPeriod;
}

export interface InquiryRequest {
  category: ScenarioType;
  selectedTag?: string;
  customContext: string;
  chartId?: string;
}

export interface InquiryResponse {
  success: boolean;
  data: StrategyAnalysisResult;
  message?: string;
}
