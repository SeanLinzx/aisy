import { api } from '@/lib/api';
import {
  applyVersionEditableText,
  type WebProjectVersionRow,
} from '@/lib/web-project-versions';

export async function patchWebProjectVersion(
  projectId: string,
  versionId: string,
  data: { notes?: string; prompt?: string },
): Promise<WebProjectVersionRow> {
  const r = await api.patch(`/web-projects/${projectId}/versions/${versionId}`, data);
  return r.data as WebProjectVersionRow;
}

/** 更新版本树节点上的「这版改了什么」说明，并同步本地 versions 列表 */
export async function updateVersionTreeNotes(params: {
  projectId: string | null | undefined;
  versions: WebProjectVersionRow[];
  versionId: string;
  text: string;
}): Promise<WebProjectVersionRow[]> {
  const v = params.versions.find((x) => x.id === params.versionId);
  if (!v) return params.versions;

  const patch = applyVersionEditableText(v, params.text);
  const nextRow: WebProjectVersionRow = { ...v, ...patch };

  if (params.projectId) {
    try {
      const saved = await patchWebProjectVersion(params.projectId, params.versionId, patch);
      return params.versions.map((row) => (row.id === params.versionId ? { ...row, ...saved } : row));
    } catch {
      /* 离线或未登录时仍更新本地展示 */
    }
  }

  return params.versions.map((row) => (row.id === params.versionId ? nextRow : row));
}
