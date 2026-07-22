import { api } from '@/lib/api';
import { fetchAssetsList, invalidateAssetsCache } from '@/lib/assets-cache';
import { parseAssetMeta } from '@/lib/asset-tabs';
import { randomUUID } from '@/lib/random-id';
import { extractPublishSlug } from '@/lib/public-url';
import { webAssetHref } from '@/lib/persist-web-asset';
import {
  DEFAULT_SINGLE_AI,
  EMPTY_AI_FLOW,
  hasPitchContent,
  loadPmAppForPitch,
  loadPmPitch,
  loadPmRequirements,
  loadPmSingleApp,
  loadPmWorkflowApp,
  pitchSectionsToMarkdown,
  savePmCreatorStep,
  savePmPitch,
  savePmRequirements,
  savePmSingleApp,
  savePmWorkflowApp,
  PM_MINI_APP_KEY,
  PM_PITCH_KEY,
  PM_REQUIREMENTS_KEY,
  PM_SINGLE_APP_KEY,
  PM_WORKFLOW_APP_KEY,
  type PitchSectionKey,
  type PmRequirementsData,
  type PmSingleAppData,
  type PmWorkflowAppData,
  emptyPrd,
} from '@/lib/pm-pipeline';
import { DEFAULT_FORM } from '@/components/course/games/freeform-app-shared';
import { EMPTY_WIZARD_ANSWERS } from '@/lib/pm-prd-wizard';
import type { PmPrdFields } from '@/lib/pm-prompts';

export const PM_ACTIVE_BUNDLE_KEY = 'course.pm.active-bundle-id';

export interface PmApplicationBundle {
  bundleId: string;
  title: string;
  productName?: string;
  appTopic?: string;
  summary?: string;
  prdAssetId?: string | null;
  pitchAssetId?: string | null;
  webProjectId?: string | null;
  webAssetId?: string | null;
  webSlug?: string | null;
  appKind?: 'single' | 'workflow' | null;
  step: 1 | 2 | 3;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
}

export type PmApplicationListItem = PmApplicationBundle & {
  assetId: string;
};

export interface PmApplicationDetail {
  bundle: PmApplicationListItem;
  prd: {
    markdown: string;
    productName?: string;
  } | null;
  app: {
    html: string;
    slug?: string | null;
    playHref?: string | null;
    topic?: string;
    appKind?: 'single' | 'workflow' | null;
  } | null;
  pitch: {
    sections: Record<PitchSectionKey, string>;
    markdown: string;
  } | null;
}

function readBundleId(): string | null {
  try {
    return localStorage.getItem(PM_ACTIVE_BUNDLE_KEY);
  } catch {
    return null;
  }
}

export function getActivePmBundleId(): string | null {
  return readBundleId();
}

export function setActivePmBundleId(bundleId: string) {
  localStorage.setItem(PM_ACTIVE_BUNDLE_KEY, bundleId);
}

export function ensureActivePmBundleId(): string {
  const existing = readBundleId();
  if (existing) return existing;
  const bundleId = randomUUID();
  setActivePmBundleId(bundleId);
  return bundleId;
}

export function clearPmCreatorDrafts() {
  localStorage.removeItem(PM_REQUIREMENTS_KEY);
  localStorage.removeItem(PM_SINGLE_APP_KEY);
  localStorage.removeItem(PM_WORKFLOW_APP_KEY);
  localStorage.removeItem(PM_MINI_APP_KEY);
  localStorage.removeItem(PM_PITCH_KEY);
  savePmCreatorStep(1);
}

export function startNewPmApplication(): string {
  const bundleId = randomUUID();
  setActivePmBundleId(bundleId);
  clearPmCreatorDrafts();
  return bundleId;
}

function buildApplicationTitle(prd: PmRequirementsData | null, appTopic?: string): string {
  const productName = prd?.prd?.productName?.trim();
  const topic = appTopic?.trim();
  return productName || topic || '我的 AI 小应用';
}

function inferStep(
  prd: PmRequirementsData | null,
  hasApp: boolean,
  pitchComplete: boolean,
): 1 | 2 | 3 {
  if (pitchComplete) return 3;
  if (hasApp) return 3;
  if (prd?.prd?.productName?.trim() || prd?.interest?.trim()) return 2;
  return 1;
}

export function buildPmApplicationBundle(bundleId: string): PmApplicationBundle {
  const prd = loadPmRequirements();
  const workflow = loadPmWorkflowApp();
  const single = loadPmSingleApp();
  const pitch = loadPmPitch();
  const appData = workflow?.html ? workflow : single?.html ? single : null;
  const appKind: PmApplicationBundle['appKind'] = workflow?.html
    ? 'workflow'
    : single?.html
      ? 'single'
      : null;
  const pitchComplete = pitch ? hasPitchContent(pitch.sections) : false;
  const hasApp = Boolean(appData?.html);
  const now = Date.now();
  const title = buildApplicationTitle(prd, appData?.form?.topic);
  const summary =
    prd?.prd?.tagline?.trim()
    || pitch?.sections?.goal?.trim()?.slice(0, 60)
    || appData?.form?.topic?.trim()
    || 'AI 产品经理 · 三步作品';

  return {
    bundleId,
    title,
    productName: prd?.prd?.productName?.trim() || undefined,
    appTopic: appData?.form?.topic?.trim() || undefined,
    summary,
    prdAssetId: prd?.assetId ?? null,
    pitchAssetId: pitch?.assetId ?? null,
    webProjectId: appData?.projectId ?? null,
    webAssetId: appData?.assetId ?? null,
    webSlug: extractPublishSlug(appData?.slug ?? null),
    appKind,
    step: inferStep(prd, hasApp, pitchComplete),
    completed: pitchComplete && Boolean(prd?.assetId || prd?.prd?.productName),
    createdAt: now,
    updatedAt: now,
  };
}

function bundleToMarkdown(bundle: PmApplicationBundle): string {
  const pitch = loadPmPitch();
  const lines = [
    `# ${bundle.title}`,
    '',
    bundle.summary ? `> ${bundle.summary}` : '',
    '',
    '## 完成进度',
    `- 需求说明书：${bundle.prdAssetId || bundle.productName ? '✅' : '⬜'}`,
    `- AI 小应用：${bundle.webAssetId || bundle.webProjectId ? '✅' : '⬜'}`,
    `- 路演材料：${bundle.completed ? '✅' : '⬜'}`,
  ];
  if (pitch && hasPitchContent(pitch.sections)) {
    lines.push('', pitchSectionsToMarkdown(pitch.sections));
  }
  return lines.filter(Boolean).join('\n');
}

async function findPmApplicationAsset(bundleId: string) {
  const items = await fetchAssetsList({ showHidden: true, all: true });
  return items.find((a: { meta?: unknown }) => {
    const meta = parseAssetMeta(a.meta);
    return meta?.kind === 'pm-application' && meta?.bundleId === bundleId;
  });
}

export async function persistPmApplicationBundle(opts?: {
  bundleId?: string;
  requireComplete?: boolean;
}): Promise<{ assetId: string; bundle: PmApplicationBundle }> {
  const bundleId = opts?.bundleId ?? ensureActivePmBundleId();
  const bundle = buildPmApplicationBundle(bundleId);

  if (opts?.requireComplete && !bundle.completed) {
    throw new Error('请先完成路演材料，再保存完整应用。');
  }
  if (!bundle.productName && !bundle.appTopic && !bundle.prdAssetId && !bundle.webAssetId) {
    throw new Error('还没有可保存的内容，请先完成至少一步。');
  }

  const existing = await findPmApplicationAsset(bundleId);
  const existingMeta = existing ? parseAssetMeta((existing as { meta?: unknown }).meta) : null;
  const createdAt =
    typeof existingMeta?.createdAt === 'number' ? existingMeta.createdAt : bundle.createdAt;
  const finalBundle = { ...bundle, createdAt, updatedAt: Date.now() };
  const payload = {
    type: 'text' as const,
    title: finalBundle.title,
    summary: finalBundle.summary,
    content: bundleToMarkdown(finalBundle),
    meta: {
      kind: 'pm-application',
      sourceGame: 'pm-creator',
      hiddenInLibrary: true,
      ...finalBundle,
    },
  };

  if (existing?.id) {
    await api.patch(`/assets/${existing.id}`, payload);
    invalidateAssetsCache();
    return { assetId: existing.id, bundle: finalBundle };
  }

  const created = await api.post('/assets', payload);
  invalidateAssetsCache();
  return { assetId: created.data.id as string, bundle: finalBundle };
}

export async function listPmApplications(): Promise<PmApplicationListItem[]> {
  const items = (await fetchAssetsList({ showHidden: true, all: true })) as Array<{ id: string; meta?: unknown; createdAt?: string; updatedAt?: string }>;
  const apps: PmApplicationListItem[] = [];

  for (const item of items) {
    const bundle = bundleFromAsset(item);
    if (!bundle) continue;
    apps.push(bundle);
  }

  return apps.sort((a, b) => b.updatedAt - a.updatedAt);
}

/** 同一 web 项目或 bundle 只展示最新一条，避免重复保存刷屏 */
export function dedupePmApplicationList(apps: PmApplicationListItem[]): PmApplicationListItem[] {
  const seen = new Set<string>();
  const out: PmApplicationListItem[] = [];
  for (const app of apps) {
    const key = app.webProjectId ? `web:${app.webProjectId}` : `bundle:${app.bundleId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(app);
  }
  return out;
}

/** 从「我的 AI 应用」移除（归档索引条目，不删需求/小应用/路演素材） */
export async function deletePmApplication(assetId: string): Promise<void> {
  await api.post(`/assets/${assetId}/archive`);
  invalidateAssetsCache();
}

function bundleFromAsset(item: { id: string; meta?: unknown; createdAt?: string; updatedAt?: string }): PmApplicationListItem | null {
  const meta = parseAssetMeta(item.meta);
  if (meta?.kind !== 'pm-application' || !meta?.bundleId) return null;
  return {
    assetId: item.id,
    bundleId: String(meta.bundleId),
    title: String(meta.title || meta.productName || '我的 AI 小应用'),
    productName: meta.productName as string | undefined,
    appTopic: meta.appTopic as string | undefined,
    summary: meta.summary as string | undefined,
    prdAssetId: (meta.prdAssetId as string | null | undefined) ?? null,
    pitchAssetId: (meta.pitchAssetId as string | null | undefined) ?? null,
    webProjectId: (meta.webProjectId as string | null | undefined) ?? null,
    webAssetId: (meta.webAssetId as string | null | undefined) ?? null,
    webSlug: extractPublishSlug(meta.webSlug as string | null | undefined),
    appKind: (meta.appKind as PmApplicationBundle['appKind']) ?? null,
    step: (meta.step as 1 | 2 | 3) ?? 3,
    completed: Boolean(meta.completed),
    createdAt: typeof meta.createdAt === 'number' ? meta.createdAt : Date.parse(item.createdAt || '') || 0,
    updatedAt: typeof meta.updatedAt === 'number' ? meta.updatedAt : Date.parse(item.updatedAt || '') || 0,
  };
}

export async function getPmApplicationByAssetId(assetId: string): Promise<PmApplicationListItem | null> {
  try {
    const asset = await fetchAsset(assetId);
    return bundleFromAsset({ id: assetId, meta: asset.meta });
  } catch {
    return null;
  }
}

export async function loadPmApplicationDetail(assetId: string): Promise<PmApplicationDetail | null> {
  const bundle = await getPmApplicationByAssetId(assetId);
  if (!bundle) return null;

  let prd: PmApplicationDetail['prd'] = null;
  let app: PmApplicationDetail['app'] = null;
  let pitch: PmApplicationDetail['pitch'] = null;

  if (bundle.prdAssetId) {
    try {
      const asset = await fetchAsset(bundle.prdAssetId);
      const meta = parseAssetMeta(asset.meta) || {};
      const prdFields = meta.prd as PmPrdFields | undefined;
      prd = {
        markdown: asset.content?.trim() || '',
        productName: prdFields?.productName?.trim() || bundle.productName,
      };
    } catch {
      /* 忽略 */
    }
  }

  if (bundle.webAssetId) {
    try {
      const asset = await fetchAsset(bundle.webAssetId) as { content?: string; url?: string | null; meta?: unknown };
      const meta = parseAssetMeta(asset.meta) || {};
      const slug =
        extractPublishSlug(typeof meta.slug === 'string' ? meta.slug : null)
        ?? extractPublishSlug(bundle.webSlug)
        ?? null;
      app = {
        html: asset.content || '',
        slug,
        playHref: webAssetHref(asset),
        topic: typeof meta.topic === 'string' ? meta.topic : bundle.appTopic,
        appKind: bundle.appKind,
      };
    } catch {
      /* 忽略 */
    }
  }

  if (bundle.pitchAssetId) {
    try {
      const asset = await fetchAsset(bundle.pitchAssetId);
      const meta = parseAssetMeta(asset.meta) || {};
      const sections = (meta.sections as Record<PitchSectionKey, string> | undefined) ?? {
        background: '',
        goal: '',
        method: '',
        effect: '',
        outlook: '',
      };
      pitch = {
        sections,
        markdown: asset.content?.trim() || pitchSectionsToMarkdown(sections),
      };
    } catch {
      /* 忽略 */
    }
  }

  return { bundle, prd, app, pitch };
}

async function fetchAsset(id: string) {
  const res = await api.get(`/assets/${id}`);
  return res.data as { id: string; content?: string; meta?: unknown };
}

function restorePrdFromAsset(asset: { id: string; meta?: unknown }) {
  const meta = parseAssetMeta(asset.meta) || {};
  const prd = (meta.prd as PmPrdFields | undefined) ?? emptyPrd();
  savePmRequirements({
    interest: typeof meta.interest === 'string' ? meta.interest : '',
    messages: [],
    prd,
    assetId: asset.id,
    inputMode: meta.inputMode === 'chat' ? 'chat' : 'wizard',
    wizardAnswers: (meta.wizardAnswers as typeof EMPTY_WIZARD_ANSWERS) ?? EMPTY_WIZARD_ANSWERS,
  });
}

function restorePitchFromAsset(asset: { id: string; meta?: unknown }) {
  const meta = parseAssetMeta(asset.meta) || {};
  const sections = (meta.sections as Record<PitchSectionKey, string> | undefined) ?? {
    background: '',
    goal: '',
    method: '',
    effect: '',
    outlook: '',
  };
  savePmPitch({ sections, assetId: asset.id });
}

function restoreSingleAppFromAsset(asset: { id: string; content?: string; meta?: unknown }) {
  const meta = parseAssetMeta(asset.meta) || {};
  const form = {
    topic: typeof meta.topic === 'string' ? meta.topic : DEFAULT_FORM.topic,
    audience: typeof meta.audience === 'string' ? meta.audience : DEFAULT_FORM.audience,
    scenario: typeof meta.scenario === 'string' ? meta.scenario : DEFAULT_FORM.scenario,
    layoutItems: typeof meta.layoutItems === 'string' ? meta.layoutItems : DEFAULT_FORM.layoutItems,
    clickTarget: typeof meta.clickTarget === 'string' ? meta.clickTarget : DEFAULT_FORM.clickTarget,
    feedback: typeof meta.feedback === 'string' ? meta.feedback : DEFAULT_FORM.feedback,
    enableImageUpload: meta.enableImageUpload === true,
  };
  const payload: Omit<PmSingleAppData, 'savedAt'> = {
    form,
    singleAi: (meta.singleAi as PmSingleAppData['singleAi']) ?? DEFAULT_SINGLE_AI,
    html: asset.content || '',
    projectId: typeof meta.projectId === 'string' ? meta.projectId : null,
    assetId: asset.id,
    slug: typeof meta.slug === 'string' ? meta.slug : null,
    headVersionId: typeof meta.headVersionId === 'string' ? meta.headVersionId : null,
  };
  savePmSingleApp(payload);
}

function restoreWorkflowAppFromAsset(asset: { id: string; content?: string; meta?: unknown }) {
  const meta = parseAssetMeta(asset.meta) || {};
  const form = {
    topic: typeof meta.topic === 'string' ? meta.topic : DEFAULT_FORM.topic,
    audience: typeof meta.audience === 'string' ? meta.audience : DEFAULT_FORM.audience,
    scenario: typeof meta.scenario === 'string' ? meta.scenario : DEFAULT_FORM.scenario,
    layoutItems: typeof meta.layoutItems === 'string' ? meta.layoutItems : DEFAULT_FORM.layoutItems,
    clickTarget: typeof meta.clickTarget === 'string' ? meta.clickTarget : DEFAULT_FORM.clickTarget,
    feedback: typeof meta.feedback === 'string' ? meta.feedback : DEFAULT_FORM.feedback,
    enableImageUpload: meta.enableImageUpload === true,
  };
  const payload: Omit<PmWorkflowAppData, 'savedAt'> = {
    form,
    aiFlow: (meta.aiFlow as PmWorkflowAppData['aiFlow']) ?? EMPTY_AI_FLOW,
    html: asset.content || '',
    projectId: typeof meta.projectId === 'string' ? meta.projectId : null,
    assetId: asset.id,
    slug: typeof meta.slug === 'string' ? meta.slug : null,
    headVersionId: typeof meta.headVersionId === 'string' ? meta.headVersionId : null,
  };
  savePmWorkflowApp(payload);
}

export async function restorePmApplicationToWorkspace(bundle: PmApplicationBundle) {
  clearPmCreatorDrafts();
  setActivePmBundleId(bundle.bundleId);

  if (bundle.prdAssetId) {
    try {
      restorePrdFromAsset(await fetchAsset(bundle.prdAssetId));
    } catch {
      /* 忽略缺失素材 */
    }
  }

  if (bundle.webAssetId) {
    try {
      const webAsset = await fetchAsset(bundle.webAssetId);
      if (bundle.appKind === 'workflow') restoreWorkflowAppFromAsset(webAsset);
      else restoreSingleAppFromAsset(webAsset);
    } catch {
      /* 忽略缺失素材 */
    }
  }

  if (bundle.pitchAssetId) {
    try {
      restorePitchFromAsset(await fetchAsset(bundle.pitchAssetId));
    } catch {
      /* 忽略缺失素材 */
    }
  }

  const step = bundle.completed ? 3 : bundle.step;
  savePmCreatorStep(step);
  return step;
}

export function getCurrentPmApplicationTitle(): string {
  const prd = loadPmRequirements();
  const app = loadPmAppForPitch();
  return buildApplicationTitle(prd, app?.form?.topic);
}
