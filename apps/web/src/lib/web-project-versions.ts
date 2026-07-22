import { mergeWebHtml } from '@/lib/merge-web-html';

export type WebProjectVersionRow = {
  id: string;
  version: number;
  html: string;
  css?: string | null;
  js?: string | null;
  prompt?: string | null;
  notes?: string | null;
  parentVersionId?: string | null;
  createdAt?: string;
};

/** 旧数据无 parentVersionId 时，按 version 序号串成一条链 */
export function normalizeVersionParents(versions: WebProjectVersionRow[]): WebProjectVersionRow[] {
  const sorted = [...versions].sort((a, b) => a.version - b.version);
  if (sorted.some((v) => v.parentVersionId)) return sorted;
  return sorted.map((v, i) => ({
    ...v,
    parentVersionId: i === 0 ? null : sorted[i - 1].id,
  }));
}

export function versionRoots(versions: WebProjectVersionRow[]): WebProjectVersionRow[] {
  const normalized = normalizeVersionParents(versions);
  const ids = new Set(normalized.map((v) => v.id));
  return normalized.filter((v) => !v.parentVersionId || !ids.has(v.parentVersionId));
}

export function versionChildren(versions: WebProjectVersionRow[], parentId: string): WebProjectVersionRow[] {
  const normalized = normalizeVersionParents(versions);
  return normalized
    .filter((v) => v.parentVersionId === parentId)
    .sort((a, b) => a.version - b.version);
}

export function versionLabel(v: WebProjectVersionRow): string {
  const text = versionEditableText(v);
  if (text) return text.length > 48 ? `${text.slice(0, 48)}…` : text;
  return `版本 ${v.version}`;
}

/** 版本树上可编辑的说明文字（优先 notes，JSON 结构取 summary） */
export function versionEditableText(v: WebProjectVersionRow): string {
  const raw = (v.notes || v.prompt || '').trim();
  if (raw.startsWith('{')) {
    try {
      const data = JSON.parse(raw) as { summary?: string };
      if (data.summary?.trim()) return data.summary.trim();
    } catch {
      /* fall through */
    }
  }
  return raw;
}

/** 把编辑后的说明写回 notes / prompt 字段 */
export function applyVersionEditableText(
  v: WebProjectVersionRow,
  text: string,
): { notes?: string; prompt?: string } {
  const trimmed = text.trim();
  const rawNotes = (v.notes || '').trim();
  if (rawNotes.startsWith('{')) {
    try {
      const data = JSON.parse(rawNotes) as Record<string, unknown>;
      return { notes: JSON.stringify({ ...data, summary: trimmed }) };
    } catch {
      /* fall through */
    }
  }
  if (v.notes?.trim()) return { notes: trimmed };
  if (v.prompt?.trim() && !v.notes?.trim()) return { prompt: trimmed };
  return { notes: trimmed };
}

/** 完整 AI 提示词（供高级编辑） */
export function versionFullPrompt(v: WebProjectVersionRow): string {
  return (v.prompt || '').trim();
}

export function versionHtml(v: WebProjectVersionRow): string {
  return mergeWebHtml({ html: v.html, css: v.css ?? '', js: v.js ?? '' });
}

export function countBranchPoints(versions: WebProjectVersionRow[]): number {
  const normalized = normalizeVersionParents(versions);
  return normalized.filter((v) => versionChildren(normalized, v.id).length > 1).length;
}
