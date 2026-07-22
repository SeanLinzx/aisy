import { api } from '@/lib/api';
import { versionHtml, type WebProjectVersionRow } from '@/lib/web-project-versions';

export type WebProjectHeadState = {
  versions: WebProjectVersionRow[];
  headVersionId: string | null;
  headHtml: string;
  slug: string | null;
  title: string;
};

/** 从 web-projects 读取 head 版本与完整版本列表（预览/迭代应以此为准） */
export async function loadWebProjectHead(projectId: string): Promise<WebProjectHeadState | null> {
  try {
    const r = await api.get(`/web-projects/${projectId}`);
    const versions = (r.data?.versions ?? []) as WebProjectVersionRow[];
    const headVersionId = (r.data?.headVersionId as string | null) ?? versions[0]?.id ?? null;
    const head = headVersionId
      ? versions.find((v) => v.id === headVersionId) ?? versions[0]
      : versions[0];
    return {
      versions,
      headVersionId: head?.id ?? headVersionId,
      headHtml: head ? versionHtml(head) : '',
      slug: (r.data?.slug as string | null) ?? null,
      title: (r.data?.title as string) || '',
    };
  } catch {
    return null;
  }
}
