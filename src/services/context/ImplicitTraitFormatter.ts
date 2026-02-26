export function formatForExtraction(traits?: any): string {
  if (!traits) return '无已知画像';

  const lines: string[] = [];

  if (traits.weighted_interest_tags?.length) {
    const topInterests = traits.weighted_interest_tags
      .sort((a: any, b: any) => (b.weight * b.confidence) - (a.weight * a.confidence))
      .slice(0, 15)
      .map((t: any) => `${t.value}(w:${t.weight},c:${t.confidence})`)
      .join(', ');
    lines.push(`- 核心关注: ${topInterests}`);
  }

  if (traits.psychometrics) {
    const p = traits.psychometrics;
    const hasSix = [p.decisiveness, p.empathy, p.drive, p.stability, p.curiosity, p.sociability].some((n) => typeof n === 'number');
    if (hasSix) {
      lines.push(`- 六维特质: 决断=${p.decisiveness ?? '-'}, 包容=${p.empathy ?? '-'}, 行动=${p.drive ?? '-'}, 稳定=${p.stability ?? '-'}, 求知=${p.curiosity ?? '-'}, 社交=${p.sociability ?? '-'}`);
    }
  }

  return lines.length ? lines.join('\n') : '无已知画像';
}
