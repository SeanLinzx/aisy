import { api } from '@/lib/api';
import { TAB_ASSET_TYPES, type AssetTabKey } from '@/lib/asset-tabs';
import type { ExportAssetItem } from '@/lib/export-student-assets';

export const STAFF_ASSETS_PAGE_SIZE = 48;

export type StaffAssetRow = ExportAssetItem & {
  thumbnailUrl?: string;
  archived?: boolean;
  createdAt: string;
  owner?: { id: string; displayName: string; username: string };
  job?: { id: string; prompt?: string; status?: string };
};

export type StaffAssetsPageResult = {
  items: StaffAssetRow[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
};

function normalizeStaffAsset(row: ExportAssetItem): StaffAssetRow {
  const r = row as StaffAssetRow;
  return {
    ...r,
    summary: r.summary ?? undefined,
    content: r.content ?? undefined,
    url: r.url ?? undefined,
    thumbnailUrl: r.thumbnailUrl ?? undefined,
  };
}

export async function fetchStaffStudentAssetsPage(params: {
  page: number;
  tab: AssetTabKey;
  ownerId?: string;
  q?: string;
  showArchived?: boolean;
}): Promise<StaffAssetsPageResult> {
  const query: Record<string, string> = {
    scope: 'students',
    showHidden: '1',
    limit: String(STAFF_ASSETS_PAGE_SIZE),
    page: String(params.page),
    types: TAB_ASSET_TYPES[params.tab].join(','),
  };
  if (params.showArchived) query.all = '1';
  if (params.ownerId) query.ownerId = params.ownerId;
  if (params.q?.trim()) query.q = params.q.trim();

  const res = await api.get('/assets', { params: query });
  const data = res.data;
  if (data?.items) {
    return {
      ...(data as StaffAssetsPageResult),
      items: (data.items as ExportAssetItem[]).map((row) => normalizeStaffAsset(row)),
    };
  }

  const items = ((data || []) as ExportAssetItem[]).map((row) => normalizeStaffAsset(row));
  return {
    items,
    total: items.length,
    page: 1,
    limit: items.length,
    hasMore: false,
  };
}
