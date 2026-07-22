import { api } from '@/lib/api';
import { invalidateAssetsCache } from '@/lib/assets-cache';

export type PmTextAssetKind = 'pm-prd' | 'pm-pitch';

/** 将 PM 课程文字产出 upsert 到素材库（type: text） */
export async function persistPmTextAsset(opts: {
  assetId?: string | null;
  title: string;
  summary?: string;
  content: string;
  meta: Record<string, unknown> & { kind: PmTextAssetKind; sourceGame: string };
}): Promise<string> {
  const payload = {
    type: 'text' as const,
    title: opts.title,
    summary: opts.summary,
    content: opts.content,
    meta: opts.meta,
  };

  const existingId = opts.assetId?.trim();
  if (existingId) {
    await api.patch(`/assets/${existingId}`, payload);
    invalidateAssetsCache();
    return existingId;
  }

  const r = await api.post('/assets', payload);
  invalidateAssetsCache();
  return r.data.id as string;
}
