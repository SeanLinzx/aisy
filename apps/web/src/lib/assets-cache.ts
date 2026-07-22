import { api } from '@/lib/api';
import { parseAssetMeta } from '@/lib/asset-tabs';

export type AssetsListQuery = {
  showHidden?: boolean;
  includeContent?: boolean;
  /** 拉取全部分页并合并（portfolio 等需要全量时显式开启） */
  all?: boolean;
  page?: number;
  limit?: number;
};

export type AssetsPageResult = {
  items: unknown[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
};

type CacheEntry = { key: string; data: unknown[]; at: number };

const TTL_MS = 20_000;
let cache: CacheEntry | null = null;
let inflight: Promise<unknown[]> | null = null;

function queryKey(query: AssetsListQuery): string {
  return JSON.stringify(query);
}

/** 素材列表变更后调用，避免 stale 数据 */
export function invalidateAssetsCache() {
  cache = null;
  inflight = null;
}

function unwrapListResponse(data: unknown): AssetsPageResult {
  if (Array.isArray(data)) {
    return { items: data, total: data.length, page: 1, limit: data.length, hasMore: false };
  }
  const page = data as AssetsPageResult;
  return {
    items: page.items || [],
    total: page.total ?? page.items?.length ?? 0,
    page: page.page ?? 1,
    limit: page.limit ?? page.items?.length ?? 0,
    hasMore: Boolean(page.hasMore),
  };
}

/** 单页请求 */
export async function fetchAssetsPage(query: AssetsListQuery = {}): Promise<AssetsPageResult> {
  const r = await api.get('/assets', {
    params: {
      page: query.page ?? 1,
      limit: query.limit ?? 48,
      ...(query.showHidden ? { showHidden: '1' } : {}),
      ...(query.includeContent ? { includeContent: '1' } : {}),
    },
  });
  return unwrapListResponse(r.data);
}

async function fetchAllAssetPages(query: AssetsListQuery): Promise<unknown[]> {
  const limit = query.limit ?? 48;
  let page = 1;
  const all: unknown[] = [];
  while (true) {
    const res = await fetchAssetsPage({ ...query, page, limit });
    all.push(...res.items);
    if (!res.hasMore) break;
    page += 1;
  }
  return all;
}

/** 带 20s 内存缓存 + 并发去重的 /assets 列表请求（默认第一页；all:true 时拉全部分页） */
export async function fetchAssetsList(query: AssetsListQuery = {}): Promise<any[]> {
  const key = queryKey(query);
  const now = Date.now();
  if (cache && cache.key === key && now - cache.at < TTL_MS) {
    return cache.data as any[];
  }
  if (inflight) return inflight;

  inflight = (async () => {
    const data = query.all ? await fetchAllAssetPages(query) : (await fetchAssetsPage(query)).items;
    cache = { key, data, at: Date.now() };
    return data;
  })().finally(() => {
    inflight = null;
  });

  return inflight;
}

/** 按需拉取单条素材的 content（网页 HTML 等） */
export async function fetchAssetContent(assetId: string): Promise<string> {
  const r = await api.get(`/assets/${assetId}`);
  return (r.data?.content as string) || '';
}

export async function findAssetByMeta(match: (meta: Record<string, unknown>) => boolean) {
  const all = await fetchAssetsList({ all: true });
  return all.find((a: { meta?: unknown }) => {
    const meta = parseAssetMeta(a.meta);
    return meta ? match(meta) : false;
  }) as { id: string; meta?: unknown; content?: string } | undefined;
}
