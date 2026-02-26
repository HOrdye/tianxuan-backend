/**
 * 时空导航 AI Prompt 模板、Zod Schema、Fallback 兜底数据
 * 按维度（yearly / monthly / daily）分离，供 timespace.service.ts 调用
 */
import { z } from 'zod';

// ─── 公共类型 ───────────────────────────────────────────────

export type TimeDimension = 'yearly' | 'monthly' | 'daily';

// 四化分析条目
const SihuaItemSchema = z.object({
  name: z.string(),
  palace: z.string(),
  effect: z.string(),
});

// 分领域提点
const DomainsSchema = z.object({
  career: z.string(),
  wealth: z.string(),
  love: z.string(),
  health: z.string(),
});

// 三旬节奏（月度专用）
const RhythmSchema = z.object({
  early: z.string(),
  mid: z.string(),
  late: z.string(),
});

// ─── 流年 Schema ────────────────────────────────────────────

export const YearlyOutputSchema = z.object({
  headline: z.string(),
  overview: z.string(),
  coreEnergy: z.string(),
  sihuaAnalysis: z.array(SihuaItemSchema),
  coreLessons: z.string(),
  domains: DomainsSchema,
  ancientWisdom: z.string(),
  do: z.array(z.string()),
  dont: z.array(z.string()),
  keywords: z.array(z.string()),
});

// ─── 流月 Schema ────────────────────────────────────────────

export const MonthlyOutputSchema = z.object({
  headline: z.string(),
  overview: z.string(),
  battle: z.string(),
  sihuaAnalysis: z.array(SihuaItemSchema),
  rhythm: RhythmSchema,
  domains: DomainsSchema,
  warning: z.string(),
  ancientWisdom: z.string(),
  do: z.array(z.string()),
  dont: z.array(z.string()),
  keywords: z.array(z.string()),
});

// ─── 流日 Schema ────────────────────────────────────────────

export const DailyOutputSchema = z.object({
  energy: z.string(),
  action: z.string(),
  warning: z.string(),
  do: z.array(z.string()),
  dont: z.array(z.string()),
  keywords: z.array(z.string()),
});

// ─── 统一 Schema 映射 ──────────────────────────────────────

export const OutputSchemaMap: Record<TimeDimension, z.ZodType<any>> = {
  yearly: YearlyOutputSchema,
  monthly: MonthlyOutputSchema,
  daily: DailyOutputSchema,
};

// ─── 统一响应类型（平铺在 data 下） ───────────────────────

export type YearlyGuidanceData = z.infer<typeof YearlyOutputSchema>;
export type MonthlyGuidanceData = z.infer<typeof MonthlyOutputSchema>;
export type DailyGuidanceData = z.infer<typeof DailyOutputSchema>;

export type AIGuidanceData = YearlyGuidanceData | MonthlyGuidanceData | DailyGuidanceData;

export interface AIGuidanceResponse {
  dimension: TimeDimension;
  data: AIGuidanceData;
  generated_at: string;
  tokens_used: number;
}

// ─── System Prompt（通用角色设定） ─────────────────────────

export const SYSTEM_PROMPT = `# 核心定位：顶级命运规划师（Time-Space Navigation）
你是一位**兼具深厚紫微斗数底蕴与现代高管战略思维的顶级命运规划师**。你正在为命主提供深度运势指引。

**你的职责**：
- 提供极具洞察力与实操价值的指引
- **必须结合父级时空背景**：流月必须在流年背景下解读，流年必须在大限背景下解读
- **不仅要“知其然”，更要“知其所以然”**：必须明确点出支撑你论点的星曜格局（如紫武阁、机月同梁、羊陀夹忌等）与宫位联动。

# Language Style (文风·绝对红线)
1. **专业笃定，战略视角**：语气要像一位顶级的高管教练与易学宗师，用词精准，逻辑严密，直击痛点。
2. **拒绝空泛说教**：所有的结论都必须有星相学支撑（"因为[星曜落位/四化]，所以[结论]"）。
3. **古典与现代的完美融合**：既要保留紫微斗数的原汁原味（宫位、星曜、四化、格局），又要给出符合现代社会的实操指导（投资、竞聘、团队管理）。
4. **行动指南 (do/dont) 格式强制**：必须采用 \`[核心动作]：[星理依据]，[落地场景]\` 的长句结构，展现你的专业深度。
5. **输出格式**：必须且只能是合法 JSON 对象，禁止 Markdown 代码块包裹、禁止多余文字。`;

// ─── 流年 Prompt 模板 ──────────────────────────────────────

export function buildYearlyPrompt(context: any): string {
  return `# 角色
你是一位紫微斗数流年分析师。请根据以下时空上下文，输出流年运势分析 JSON。

# 时空上下文
${JSON.stringify(context, null, 2)}

# 输出 JSON Schema（必须严格匹配每个字段名）
{
  "headline": "年度主题标题，带Emoji，如'🪐 天梁庇荫，破军革新'",
  "overview": "年度总论，必须点出流年命宫、主星、大限背景，以及双禄朝垣/羊陀夹忌等核心格局",
  "coreEnergy": "核心能量分析，深入解读命宫主星与辅星的能量交互与冲撞",
  "sihuaAnalysis": [
    {"name": "化禄星名", "palace": "所在宫位", "effect": "影响描述"},
    {"name": "化权星名", "palace": "所在宫位", "effect": "影响描述"},
    {"name": "化科星名", "palace": "所在宫位", "effect": "影响描述"},
    {"name": "化忌星名", "palace": "所在宫位", "effect": "影响描述"}
  ],
  "coreLessons": "核心课题，概括今年最重要的平衡点或矛盾点",
  "domains": {
    "career": "事业领域提点",
    "wealth": "财运领域提点",
    "love": "感情领域提点",
    "health": "健康领域提点"
  },
  "ancientWisdom": "古人观星点窍，半文言风格",
  "do": ["宜做事项1，格式：[核心动作]：[星理依据]，[具体场景]", "宜做事项2..."],
  "dont": ["忌做事项1，格式：[核心动作]：[星理依据]，[具体场景]", "忌做事项2..."],
  "keywords": ["关键词1", "关键词2", "关键词3"]
}

# Few-Shot 示例
{
  "headline": "🪐 天梁庇荫，破军革新",
  "overview": "流年命宫落在疾厄宫（午），主星天梁化科，辅星禄存同度，又有大限天梁化禄来照，形成“双禄朝垣”与“科星守命”的吉格。这一年，你将沐浴在贵人与福荫之中，身心安稳，自带光芒。然而，大限主星破军在子女宫持续发力，赋予你颠覆旧模式、开创新局面的强烈动能。外有天梁护体，内有破军革新，是在稳定中寻求突破的关键年份。",
  "coreEnergy": "破军主星坐大限子女宫，激发你对于投资、团队管理或创意项目的改革意识，有打破常规、重装系统的冲动。流年命宫禄存带来稳定的财源与安全感，尤其利于健康养生、固定资产积累。但需警惕擎羊在财帛宫与迁移宫的陀罗构成“羊陀夹忌”之势（廉贞化忌在财帛），防范冲动决策或人际纠纷导致财务损失。",
  "sihuaAnalysis": [
    {"name": "天同化禄", "palace": "夫妻宫", "effect": "天同福星化禄入夫妻，感情温馨，伴侣关系融洽。单身者易遇温柔体贴的对象，可借此机会确立长远关系。"},
    {"name": "天机化权", "palace": "田宅宫", "effect": "天机主变动，化权入田宅，家中易有搬迁、装修或房产交易，权力地位在家庭中提升，适合进行资产优化。"},
    {"name": "文昌化科", "palace": "命宫", "effect": "文昌星化科，才华被高度认可，各类考试、商务谈判、文书事宜推进顺利，个人名声与行业影响力显著上扬。"},
    {"name": "廉贞化忌", "palace": "财帛宫", "effect": "廉贞囚星化忌，逢羊陀夹忌，财务极易生波折。必须警惕投资失误、合作破财或灰色收入引发的深层法律麻烦。"}
  ],
  "coreLessons": "今年核心课题是平衡“变革”与“守成”。破军能量需要出口，可大胆尝试新项目、新技能，但必须在专业领域内求变，避免根基动摇；同时廉贞化忌在财帛，切忌高风险试探。",
  "domains": {
    "career": "事业上虽有破军的冲劲，但依托天梁化科，更适合在原有平台上进行机制创新或技术升级，而非盲目跳槽。贵人运强，多向资深前辈请教。",
    "wealth": "正财稳健，但偏财有风险。廉贞化忌在财帛，切勿触碰法律边缘的赚钱门路。适合将资金投入到固定资产或自我提升中。",
    "love": "天同化禄带来和谐的感情运，已婚者生活美满，未婚者通过长辈介绍易得良缘。但需注意不要因过度安逸而忽略了对方的精神需求。",
    "health": "天梁坐命主寿，大体安康。但需注意循环系统与眼部保养。适量运动，保持心态平和，是今年最好的养生之道。"
  },
  "ancientWisdom": "破军化气曰耗，天梁化气曰荫。耗之以新，荫之以德。先破后立，德泽绵长。",
  "do": [
    "宜大胆创新：破军星动，适合推翻旧有流程，尝试新工具或新方法，重塑核心竞争力。",
    "宜结交长者：天梁化科，多与行业前辈、师长交流，能获得关键指点与资源庇护。",
    "宜置产装修：天机化权入田宅，利于房产买卖或家居环境改善，增强家庭运势。"
  ],
  "dont": [
    "忌触碰灰产：廉贞化忌在财帛，严禁涉及任何法律边缘的获利行为，否则易招官非。",
    "忌盲目扩张：羊陀夹忌，资金链易吃紧，不宜进行超出能力范围的大额投资。"
  ],
  "keywords": ["革新", "庇荫", "守正"]
}

# 规则
- headline: 带有契合Emoji，4+4或对仗结构
- overview: 必须点出流年命宫、主星、大限背景，以及双禄朝垣/羊陀夹忌等核心格局
- coreEnergy: 深入解读命宫主星与辅星的能量交互与冲撞
- sihuaAnalysis: 恰好4个元素（禄权科忌各一）
- coreLessons: 概括今年最重要的平衡点或矛盾点
- domains: 每个字段具体深入
- ancientWisdom: 半文言，四言或七言诗诀体
- do: 3-5条，必须采用格式：[核心动作]：[星理依据]，[落地场景]
- dont: 2-3条，必须采用格式：[核心动作]：[星理依据]，[落地场景]
- keywords: 恰好3个，每个≤4字
- 不要输出任何 JSON 以外的内容`;
}

// ─── 流月 Prompt 模板 ──────────────────────────────────────

export function buildMonthlyPrompt(context: any): string {
  return `# 角色
你是一位紫微斗数流月分析师。请根据以下时空上下文，输出流月运势分析 JSON。

# 时空上下文
${JSON.stringify(context, null, 2)}

# 输出 JSON Schema（必须严格匹配每个字段名）
{
  "headline": "月度主题标题，带Emoji，4+4或对仗结构",
  "overview": "月度总论，必须点出流月命宫主星，解释四化格局影响，并结合流年背景",
  "battle": "本月战役定性，1-2句话",
  "sihuaAnalysis": [
    {"name": "化禄星名", "palace": "所在宫位", "effect": "影响描述"},
    {"name": "化权星名", "palace": "所在宫位", "effect": "影响描述"},
    {"name": "化科星名", "palace": "所在宫位", "effect": "影响描述"},
    {"name": "化忌星名", "palace": "所在宫位", "effect": "影响描述"}
  ],
  "rhythm": {
    "early": "上旬节奏，20-40字",
    "mid": "中旬节奏，20-40字",
    "late": "下旬节奏，20-40字"
  },
  "domains": {
    "career": "事业领域提点",
    "wealth": "财运领域提点",
    "love": "感情领域提点",
    "health": "健康领域提点"
  },
  "warning": "关键预警，1-2句话",
  "ancientWisdom": "古诀点睛，四言或七言诗诀体",
  "do": ["宜做事项1，格式：[核心动作]：[星理依据]，[具体场景]", "宜做事项2..."],
  "dont": ["忌做事项1，格式：[核心动作]：[星理依据]，[具体场景]", "忌做事项2..."],
  "keywords": ["关键词1", "关键词2", "关键词3"]
}

# Few-Shot 示例
{
  "headline": "🌙 权星照命，贵人引路",
  "overview": "本月流月命宫与流年命宫重合，紫微帝星加临，带来强大的气场与领导力。流月四化中，武曲化权直入命宫，让你在决策时更显果敢与魄力；太阳化禄入父母宫，长辈、上司将成为你的坚实后盾。然而，天同化忌在夫妻宫，需警惕感情上的小波折。整体而言，这是以权威开路、以人情护航的月份。",
  "battle": "此乃进攻月。紫微化权主导，利于开疆拓土，掌握主动权。",
  "sihuaAnalysis": [
    {"name": "武曲化权", "palace": "命宫", "effect": "武曲为财星，化权代表对财务、事业的掌控力增强。适合推进重要项目，但易导致性格刚硬，注意沟通方式。"},
    {"name": "太阳化禄", "palace": "父母宫", "effect": "太阳主光明，化禄代表长辈、上司的关爱与资源倾斜。可能有长辈赠礼、领导提携，利于学习传统文化。"},
    {"name": "太阴化科", "palace": "子女宫", "effect": "太阴化科，下属、学生方面有喜事，在投资、创意项目上易获赞誉，也利于女性贵人相助。"},
    {"name": "天同化忌", "palace": "夫妻宫", "effect": "天同是福星，化忌则福气打折，容易与伴侣产生误会。单身者可能因过度理想化而失望，需多包容。"}
  ],
  "rhythm": {
    "early": "能量充沛，宜果断出击，确立本月核心目标。",
    "mid": "天干转旺，外部资源注入，利于借势发展。",
    "late": "收官阶段，化忌力量显现，宜放缓节奏，修复人际关系。"
  },
  "domains": {
    "career": "紫微逢武曲化权，职场领导力爆发，适合竞聘、主导会议，但需防功高盖主。",
    "wealth": "正财运稳健，武曲化权带来实实在在的收益，投资宜选择稳健型项目。",
    "love": "天同化忌在夫妻，感情易受外界诱惑或沟通不畅影响，注意烂桃花。",
    "health": "廉贞化忌（流年）波及，需注意防范炎症、意外出血或心血管问题。"
  },
  "warning": "虽然权星高照，但不可恃才傲物，尤其是对待伴侣和合伙人要多一份耐心。",
  "ancientWisdom": "紫微仗剑镇乾坤，武曲化权号令尊。莫道功成无阻滞，天同化忌惹愁痕。",
  "do": [
    "宜主动争取权责：武曲化权在命，适合竞聘、述职、谈判，展现专业实力。",
    "宜拜访长辈上司：太阳化禄在父母宫，多汇报多请教，易获得关键资源或政策倾斜。",
    "宜开展创意项目：太阴化科，利于策划、设计或女性相关业务的推广。"
  ],
  "dont": [
    "忌情绪化沟通：天同化忌，切莫因一时情绪失控而伤害亲密关系。",
    "忌强行压制下属：紫微帝星易显霸道，需注意倾听，避免独断专行。"
  ],
  "keywords": ["掌权", "贵人", "防傲"]
}

# 规则
- headline: 带有契合Emoji，4+4或对仗结构
- overview: 必须点出流月命宫主星，解释四化格局影响，并结合流年背景
- battle: 1-2句话，定性本月核心战役
- sihuaAnalysis: 恰好4个元素，effect 20-40字
- rhythm: 必须是对象 {early, mid, late}，每段 20-40字
- domains: 每个字段 30-60字
- warning: 1-2句关键预警
- ancientWisdom: 四言或七言诗诀体
- do: 2-4条，必须采用格式：[核心动作]：[星理依据]，[落地场景]
- dont: 1-3条，必须采用格式：[核心动作]：[星理依据]，[落地场景]
- keywords: 恰好3个，每个≤4字
- 不要输出任何 JSON 以外的内容`;
}

// ─── 流日 Prompt 模板 ──────────────────────────────────────

export function buildDailyPrompt(context: any): string {
  return `# 角色
你是一位紫微斗数流日分析师。请根据以下时空上下文，输出今日运势指导 JSON。

# 时空上下文
${JSON.stringify(context, null, 2)}

# 输出 JSON Schema（必须严格匹配每个字段名）
{
  "energy": "今日气象概述，1-2句",
  "action": "行事心法，3-5条，每条以'宜：'或'忌：'开头，换行分隔",
  "warning": "避坑指南，1-2句",
  "do": ["宜做事项1，格式：[核心动作]：[星理依据]，[具体场景]", "宜做事项2..."],
  "dont": ["忌做事项1，格式：[核心动作]：[星理依据]，[具体场景]", "忌做事项2..."],
  "keywords": ["关键词1", "关键词2", "关键词3"]
}

# Few-Shot 示例
{
  "energy": "甲子日，木水相生，生发之气旺盛，万物萌动。",
  "action": "宜：主动拓展人脉，把握合作机遇\\n宜：出行远行，利于开拓新局\\n忌：固执己见，强行推进既定计划",
  "warning": "今日化禄入命，财运亨通，然需防因贪多而分散精力，适可而止。",
  "do": [
    "宜拓展人脉：太阴化科照命，利于结交女性贵人，适合商务洽谈与资源置换。",
    "宜出行远行：迁移宫逢吉星，出门见喜，利于跨地区业务拓展。"
  ],
  "dont": [
    "忌固执己见：擎羊在命，易因性格刚直错失良机，凡事宜留三分余地。"
  ],
  "keywords": ["生发", "主动", "忌固执"]
}

# 规则
- energy: 1-2句今日气象概述
- action: 3-5条，每条以"宜："或"忌："开头，用 \\n 换行分隔
- warning: 1-2句避坑提醒
- do: 2-3条，必须采用格式：[核心动作]：[星理依据]，[落地场景]
- dont: 1-2条，必须采用格式：[核心动作]：[星理依据]，[落地场景]
- keywords: 恰好3个，每个≤4字
- 不要输出任何 JSON 以外的内容`;
}

// ─── Prompt 构建器映射 ─────────────────────────────────────

export const PromptBuilderMap: Record<TimeDimension, (ctx: any) => string> = {
  yearly: buildYearlyPrompt,
  monthly: buildMonthlyPrompt,
  daily: buildDailyPrompt,
};

// ─── Fallback 兜底数据 ─────────────────────────────────────

export const YearlyFallback: YearlyGuidanceData = {
  headline: '厚积薄发，静待花开',
  overview: '本年命宫主星能量平稳，大限行至守成之地，宜固本培元、静候时机。虽无大起之象，然根基稳固者终得厚报。当以不变应万变，在沉淀中积蓄力量，待得天时地利，方可一鸣惊人。',
  coreEnergy: '命宫主星力量内敛，偏重自省与积累。外在机遇虽不显著，内在修为却可大幅精进。此年重在"养"字——养气、养志、养人脉。',
  sihuaAnalysis: [
    { name: '化禄', palace: '命宫', effect: '禄入命宫，主内在满足感提升，适合深耕专业领域。' },
    { name: '化权', palace: '事业宫', effect: '权入事业，掌控力增强，可主动争取核心项目。' },
    { name: '化科', palace: '财帛宫', effect: '科入财帛，理财思路清晰，适合规划长期资产。' },
    { name: '化忌', palace: '迁移宫', effect: '忌入迁移，外出奔波易受阻，减少不必要远行。' },
  ],
  coreLessons: '本年核心课题在于"取舍"。诸事不可贪多，聚焦一到两个关键目标，深耕细作，方能有所成就。',
  domains: {
    career: '事业稳中求进，不宜冒进跳槽，深耕现有领域可见成效。',
    wealth: '财运平稳，正财为主，投资宜保守，避免高风险操作。',
    love: '感情平淡中见真情，已有伴侣者重在经营，单身者缘分在下半年。',
    health: '注意脾胃调养，作息规律为要，秋冬季节尤需保暖。',
  },
  ancientWisdom: '潜龙勿用，阳在下也。君子以俟时而动，不妄作劳。',
  do: [
    '宜深耕专业：禄入命宫，适合考取证书或钻研核心技术，提升职场护城河。',
    '宜长线规划：科星守财，利于制定三年以上的资产配置方案，而非短线博弈。',
    '宜积累人脉：主星内敛，适合在小圈子内建立深度信任，而非广泛无效社交。'
  ],
  dont: [
    '忌盲目跳槽：大限运势平缓，新环境可能不及旧环境稳定，动不如静。',
    '忌高险投资：化忌在迁移，外部市场波动大，不宜触碰不熟悉的杠杆产品。'
  ],
  keywords: ['沉淀', '聚焦', '守正'],
};

export const MonthlyFallback: MonthlyGuidanceData = {
  headline: '🌙 蓄势待发，稳步前行',
  overview: '本月整体能量趋于平缓，宜梳理前期成果、补足短板。在流年稳健基调下，本月适合做阶段性总结与下一步规划。',
  battle: '本月核心战役在于"梳理与沉淀"，为下月发力做好准备。',
  sihuaAnalysis: [
    { name: '化禄', palace: '命宫', effect: '内心满足感上升，利于自我提升。' },
    { name: '化权', palace: '事业宫', effect: '工作掌控力增强，可主动出击。' },
    { name: '化科', palace: '财帛宫', effect: '理财头脑清醒，适合规划开支。' },
    { name: '化忌', palace: '迁移宫', effect: '外出不顺，减少远途出行。' },
  ],
  rhythm: {
    early: '上旬能量蓄积，宜整理内务、盘点资源，静待转机。',
    mid: '中旬天干转旺，可小范围试探新方向，勿大举投入。',
    late: '下旬收官阶段，总结本月得失，为下月蓄力布局。',
  },
  domains: {
    career: '工作以完成既定任务为主，不宜主动挑起新项目。',
    wealth: '财务平稳，控制非必要开支，为大额支出预留空间。',
    love: '感情互动宜温和，避免因琐事引发争执。',
    health: '注意休息，避免过度劳累，适当运动调节身心。',
  },
  warning: '月中前后注意口舌是非，与同事沟通时注意措辞。',
  ancientWisdom: '善战者无赫赫之功，善谋者先立于不败。',
  do: [
    '宜梳理复盘：月令平稳，适合整理过往项目文档，总结得失经验。',
    '宜补足短板：化科在财，利用空闲时间学习理财知识或专业技能。',
    '宜维护关系：化禄在命，情绪稳定，适合与重要合作伙伴进行深度对谈。'
  ],
  dont: [
    '忌冲动消费：化忌在外，容易受外界广告诱导而购买不实用物品。',
    '忌与人争执：情绪虽稳但易敏感，避免陷入无意义的口舌之争。'
  ],
  keywords: ['梳理', '蓄势', '稳健'],
};

export const DailyFallback: DailyGuidanceData = {
  energy: '今日能量平稳，宜静守待机。',
  action: '宜：低调行事，稳步推进\n忌：冒进决策，仓促表态',
  warning: '数据解析异常，以下为基础推演结果。',
  do: [
    '宜低调行事：运势平平，适合处理日常琐事，不宜强出头。',
    '宜稳步推进：按部就班完成计划表任务，保持节奏感。'
  ],
  dont: [
    '忌冒进决策：信息不足，今日不宜拍板重大事项，建议搁置。'
  ],
  keywords: ['平稳', '静守', '待机'],
};

export const FallbackMap: Record<TimeDimension, AIGuidanceData> = {
  yearly: YearlyFallback,
  monthly: MonthlyFallback,
  daily: DailyFallback,
};
