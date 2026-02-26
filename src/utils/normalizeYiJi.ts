import { PaidYiJiItem, PaidYiJiNote } from '../types/strategy';

/**
 * 运势宜忌防偏清洗引擎
 * 三条核心规则 + action 长度截断
 */

// 规则1：action 弱动词前缀裁剪
const WEAK_PREFIXES = ['建议', '适合', '避免', '可以', '需要', '应该', '尽量', '注意'];

// 规则2：dont 中包含正面词汇的条目应移入 do 或丢弃
const POSITIVE_WORDS = ['宜', '适合', '有利于', '建议', '推荐', '有助于', '利于'];

// 规则2 反向：do 中包含负面词汇的条目应移入 dont 或丢弃
const NEGATIVE_WORDS = ['忌', '避免', '不宜', '不要', '切勿', '禁忌', '慎'];

const ACTION_MAX_LENGTH = 20;

function trimWeakPrefix(action: string): string {
  for (const prefix of WEAK_PREFIXES) {
    if (action.startsWith(prefix)) {
      return action.slice(prefix.length);
    }
  }
  return action;
}

function truncateAction(item: PaidYiJiItem): PaidYiJiItem {
  if (item.action.length <= ACTION_MAX_LENGTH) return item;
  const truncated = item.action.slice(0, ACTION_MAX_LENGTH);
  const overflow = item.action.slice(ACTION_MAX_LENGTH);
  const newReason = item.reason ? `${overflow}。${item.reason}` : overflow;
  return { ...item, action: truncated, reason: newReason };
}

function containsAny(text: string, words: string[]): boolean {
  return words.some(w => text.includes(w));
}

function dedupeByTag(items: PaidYiJiItem[]): PaidYiJiItem[] {
  if (items.length === 0) return items;
  const tagMap = new Map<string, PaidYiJiItem>();
  const noTag: PaidYiJiItem[] = [];

  for (const item of items) {
    if (!item.tags || item.tags.length === 0) {
      noTag.push(item);
      continue;
    }
    const key = item.tags.sort().join(',');
    const existing = tagMap.get(key);
    if (!existing || (item.priority || 3) < (existing.priority || 3)) {
      tagMap.set(key, item);
    }
  }
  return [...tagMap.values(), ...noTag];
}

export interface NormalizedYiJiResult {
  do: PaidYiJiItem[];
  dont: PaidYiJiItem[];
  note?: PaidYiJiNote;
}

export function normalizeYiJiResult(
  doItems: PaidYiJiItem[],
  dontItems: PaidYiJiItem[],
  note?: PaidYiJiNote
): NormalizedYiJiResult {
  const cleanedDo: PaidYiJiItem[] = [];
  const cleanedDont: PaidYiJiItem[] = [];

  // 规则1 + 规则4：清洗 do 条目
  for (const item of doItems) {
    let cleaned = { ...item, action: trimWeakPrefix(item.action) };
    cleaned = truncateAction(cleaned);
    // 规则2 反向：do 中含负面词汇 → 移入 dont
    if (containsAny(cleaned.action, NEGATIVE_WORDS)) {
      cleanedDont.push(cleaned);
    } else {
      cleanedDo.push(cleaned);
    }
  }

  // 规则1 + 规则4：清洗 dont 条目
  for (const item of dontItems) {
    let cleaned = { ...item, action: trimWeakPrefix(item.action) };
    cleaned = truncateAction(cleaned);
    // 规则2：dont 中含正面词汇 → 移入 do
    if (containsAny(cleaned.action, POSITIVE_WORDS)) {
      cleanedDo.push(cleaned);
    } else {
      cleanedDont.push(cleaned);
    }
  }

  // 规则3：同 tag 去重（按 priority 保留最高）
  const dedupedDo = dedupeByTag(cleanedDo);
  const dedupedDont = dedupeByTag(cleanedDont);

  // 规则5（方案补充）：note 存在时 dont P1 最多保留 1 条
  let finalDont = dedupedDont;
  if (note) {
    const p1Items = dedupedDont.filter(i => i.priority === 1);
    const otherItems = dedupedDont.filter(i => i.priority !== 1);
    finalDont = [...p1Items.slice(0, 1), ...otherItems];
  }

  return {
    do: dedupedDo,
    dont: finalDont,
    note,
  };
}
