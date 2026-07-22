import { readKidLocalDraft, writeKidLocalDraft } from '@/lib/kid-app-local-draft';

export const WEB_PROJECT_LOCAL_PREFIX = 'kid-app.local.web:';

export interface WebProjectLocalData {
  title: string;
  prompt: string;
  html: string;
  css: string;
  js: string;
}

export function webProjectLocalKey(projectId: string) {
  return `${WEB_PROJECT_LOCAL_PREFIX}${projectId || 'new'}`;
}

export function saveWebProjectLocal(projectId: string, data: WebProjectLocalData) {
  return writeKidLocalDraft(webProjectLocalKey(projectId), data);
}

export function loadWebProjectLocal(projectId: string): WebProjectLocalData | null {
  return readKidLocalDraft<WebProjectLocalData>(webProjectLocalKey(projectId))?.data ?? null;
}
