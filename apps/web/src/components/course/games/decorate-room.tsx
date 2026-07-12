'use client';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { resolveUploadPath } from '@/lib/upload-url';
import { AiWarning } from '@/components/ai-warning';
import { AiProgress } from '@/components/course/ai-progress';
import { absoluteAssetUrl, assetPath } from '@/lib/asset-path';
import { useReportGameProgress } from '@/hooks/use-report-game-progress';
import { reportGrowth } from '@/lib/growth-report';
import {
  loadDecorateRoomDraft,
  restoreNodeSeq,
  saveDecorateRoomThemeDraft,
  type RoomNode,
} from '@/lib/decorate-room-draft';
import type { DecorateRoomThemeProgress, GameProgressStatus } from '@/lib/course-game-progress';

interface RoomTheme {
  id: string;
  title: string;
  emoji: string;
  subject: string;
  rootLabel: string;
  image: string;
}

interface ThemeState {
  nodes: RoomNode[];
  currentId: string;
  savedAssetId: string | null;
  nodeSeq: number;
}

const THEMES: RoomTheme[] = [
  { id: 'nailong', title: '奶龙的房间', emoji: '🐉', subject: '那只圆润的奶黄色小恐龙', rootLabel: '奶龙的空房间', image: assetPath('/nailong-room.png') },
  { id: 'ultraman', title: '奥特曼的房间', emoji: '🦸', subject: '那个银红色的奥特曼玩具', rootLabel: '奥特曼的空房间', image: assetPath('/ultraman-room.jpg') },
  { id: 'princess', title: '小公主的房间', emoji: '👑', subject: '那位戴皇冠、穿蓝色公主裙的小女孩', rootLabel: '小公主的空房间', image: assetPath('/princess-room.jpg') },
];
const ROOT_ID = 'root';

function themeProgressFromState(
  tid: string,
  state: ThemeState,
  generating: boolean,
  error?: string,
): DecorateRoomThemeProgress {
  const rounds = state.nodes.length - 1;
  const currentNode = state.nodes.find((n) => n.id === state.currentId) ?? state.nodes[0];
  const doneNodes = state.nodes.filter((n) => n.id !== ROOT_ID);
  let status: GameProgressStatus = 'idle';
  if (generating) status = 'generating';
  else if (error && rounds === 0) status = 'failed';
  else if (rounds > 0) status = 'done';
  return {
    themeId: tid,
    status,
    prompt: currentNode.id === ROOT_ID ? undefined : currentNode.request,
    thumbnailUrl: currentNode.url,
    imageUrls: doneNodes.map((n) => n.url),
    roundCount: rounds,
    summary: rounds > 0 ? `已装修 ${rounds} 轮` : undefined,
    items: doneNodes.map((n, idx) => ({ url: n.url, prompt: n.request, label: `第 ${idx + 1} 轮` })),
    error: error || undefined,
  };
}

function buildThemesProgress(
  draft: Record<string, ThemeState>,
  generatingThemes: Set<string>,
  errorByTheme: Record<string, string>,
): Record<string, DecorateRoomThemeProgress> {
  return Object.fromEntries(
    THEMES.map((t) => {
      const state = draft[t.id] ?? defaultThemeState(t);
      return [t.id, themeProgressFromState(t.id, state, generatingThemes.has(t.id), errorByTheme[t.id])];
    }),
  );
}

function defaultThemeState(t: RoomTheme): ThemeState {
  return {
    nodes: [{ id: ROOT_ID, parentId: null, request: t.rootLabel, url: t.image }],
    currentId: ROOT_ID,
    savedAssetId: null,
    nodeSeq: 0,
  };
}

function themeStateFromDraft(v: { nodes: RoomNode[]; currentId: string; savedAssetId?: string | null; nodeSeq?: number }): ThemeState {
  const nodeSeq = v.nodeSeq ?? restoreNodeSeq(v.nodes);
  return { nodes: v.nodes, currentId: v.currentId, savedAssetId: v.savedAssetId ?? null, nodeSeq };
}

function buildTreeMeta(state: ThemeState, tid: string) {
  return {
    kind: 'decorate-room',
    version: 1,
    themeId: tid,
    currentId: state.currentId,
    nodes: state.nodes.map((n) => ({
      id: n.id,
      parentId: n.parentId,
      request: n.request,
      url: n.url,
    })),
  };
}

export function DecorateRoomGame() {
  const report = useReportGameProgress('decorate-room');
  const [themeId, setThemeId] = useState(THEMES[0].id);
  const theme = useMemo(() => THEMES.find((t) => t.id === themeId) ?? THEMES[0], [themeId]);
  const [nodes, setNodes] = useState<RoomNode[]>(defaultThemeState(THEMES[0]).nodes);
  const [currentId, setCurrentId] = useState<string>(ROOT_ID);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedAssetId, setSavedAssetId] = useState<string | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [generatingThemes, setGeneratingThemes] = useState<Set<string>>(() => new Set());
  const [requestByTheme, setRequestByTheme] = useState<Record<string, string>>({});
  const [errorByTheme, setErrorByTheme] = useState<Record<string, string>>({});

  const draftRef = useRef<Record<string, ThemeState>>({});
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const assetSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextAssetSave = useRef(true);
  const themeIdRef = useRef(themeId);
  const requestByThemeRef = useRef(requestByTheme);
  themeIdRef.current = themeId;
  requestByThemeRef.current = requestByTheme;

  const request = requestByTheme[themeId] ?? '';
  const error = errorByTheme[themeId] ?? null;
  const loading = generatingThemes.has(themeId);

  const applyThemeState = useCallback((state: ThemeState) => {
    setNodes(state.nodes);
    setCurrentId(state.currentId);
    setSavedAssetId(state.savedAssetId);
    setSaved(state.nodes.length > 1 && !!state.savedAssetId);
  }, []);

  const getThemeState = useCallback((id: string): ThemeState => {
    const cached = draftRef.current[id];
    if (cached) return cached;
    const t = THEMES.find((x) => x.id === id) ?? THEMES[0];
    return defaultThemeState(t);
  }, []);

  const persistThemeDraft = useCallback(async (id: string, activeId?: string) => {
    const snap = draftRef.current[id];
    if (!snap) return;
    await saveDecorateRoomThemeDraft(id, snap, activeId ?? themeIdRef.current);
  }, []);

  const scheduleDraftSave = useCallback(() => {
    if (!draftReady) return;
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      const id = themeIdRef.current;
      const snap = draftRef.current[id];
      if (!snap) return;
      void saveDecorateRoomThemeDraft(id, snap, id);
    }, 800);
  }, [draftReady]);

  const persistRecordToAssets = useCallback(async (tid: string) => {
    const snap = draftRef.current[tid];
    if (!snap || snap.nodes.length <= 1) return;

    const t = THEMES.find((x) => x.id === tid) ?? THEMES[0];
    const currentNode = snap.nodes.find((n) => n.id === snap.currentId) ?? snap.nodes[0];
    const rounds = snap.nodes.length - 1;
    const branchPoints = snap.nodes.filter((n) => snap.nodes.filter((c) => c.parentId === n.id).length > 1).length;
    const isActive = tid === themeIdRef.current;

    if (isActive) {
      setSaving(true);
      setErrorByTheme((prev) => ({ ...prev, [tid]: '' }));
    }

    try {
      const summary = branchPoints > 0
        ? `共 ${rounds} 轮装修，${branchPoints} 个分支点，${snap.nodes.length} 个版本`
        : `共 ${rounds} 轮装修，${snap.nodes.length} 个版本`;
      const meta = buildTreeMeta(snap, tid);
      const payload = {
        type: 'mixed' as const,
        title: `${t.title}装修记录`,
        summary,
        content: JSON.stringify(meta, null, 2),
        url: currentNode.url,
        thumbnailUrl: currentNode.url,
        meta,
      };
      let nextAssetId = snap.savedAssetId;
      if (snap.savedAssetId) {
        await api.patch(`/assets/${snap.savedAssetId}`, payload);
      } else {
        const r = await api.post('/assets', payload);
        nextAssetId = r.data.id;
      }

      draftRef.current[tid] = { ...snap, savedAssetId: nextAssetId };
      void saveDecorateRoomThemeDraft(tid, draftRef.current[tid], themeIdRef.current);

      if (isActive) {
        setSavedAssetId(nextAssetId);
        setSaved(true);
      }

      if (!snap.savedAssetId) {
        reportGrowth({
          kind: 'creation',
          gameSlug: 'decorate-room',
          title: `${t.emoji} 给${t.title.replace('的房间', '')}装修房间`,
          summary,
          mediaUrl: currentNode.url,
        });
      }
    } catch (e: any) {
      if (isActive) {
        setErrorByTheme((prev) => ({ ...prev, [tid]: e?.message || '自动保存失败' }));
        setSaved(false);
      }
    } finally {
      if (isActive) setSaving(false);
    }
  }, []);

  const scheduleAssetSave = useCallback(
    (tid: string) => {
      if (!draftReady) return;
      if (assetSaveTimer.current) clearTimeout(assetSaveTimer.current);
      assetSaveTimer.current = setTimeout(() => {
        void persistRecordToAssets(tid);
      }, 1200);
    },
    [draftReady, persistRecordToAssets],
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      const draft = await loadDecorateRoomDraft();
      if (!alive) return;
      if (draft?.themes) {
        draftRef.current = Object.fromEntries(
          Object.entries(draft.themes).map(([k, v]) => [k, themeStateFromDraft(v)]),
        );
        const active = draft.activeThemeId && THEMES.some((t) => t.id === draft.activeThemeId) ? draft.activeThemeId : THEMES[0].id;
        const state = draftRef.current[active] ?? defaultThemeState(THEMES[0]);
        setThemeId(active);
        applyThemeState(state);
      }
      setDraftReady(true);
    })();
    return () => {
      alive = false;
      if (draftTimer.current) clearTimeout(draftTimer.current);
      if (assetSaveTimer.current) clearTimeout(assetSaveTimer.current);
    };
  }, [applyThemeState]);

  useEffect(() => {
    draftRef.current[themeId] = {
      nodes,
      currentId,
      savedAssetId,
      nodeSeq: draftRef.current[themeId]?.nodeSeq ?? restoreNodeSeq(nodes),
    };
    scheduleDraftSave();
  }, [nodes, currentId, savedAssetId, themeId, scheduleDraftSave]);

  function switchTheme(id: string) {
    if (id === themeId) return;
    const t = THEMES.find((x) => x.id === id);
    if (!t) return;

    draftRef.current[themeId] = {
      nodes,
      currentId,
      savedAssetId,
      nodeSeq: draftRef.current[themeId]?.nodeSeq ?? restoreNodeSeq(nodes),
    };
    setRequestByTheme((prev) => ({ ...prev, [themeId]: request }));

    if (draftReady) {
      void persistThemeDraft(themeId, id);
    }

    const cached = draftRef.current[id] ?? defaultThemeState(t);
    draftRef.current[id] = cached;
    setThemeId(id);
    applyThemeState(cached);
    setSaving(false);
  }

  const current = useMemo(() => nodes.find((n) => n.id === currentId) ?? nodes[0], [nodes, currentId]);
  const roundCount = nodes.length - 1;
  const branchPointCount = useMemo(() => {
    return nodes.filter((n) => nodes.filter((c) => c.parentId === n.id).length > 1).length;
  }, [nodes]);

  useEffect(() => {
    if (!draftReady || roundCount === 0) return;
    if (skipNextAssetSave.current) {
      skipNextAssetSave.current = false;
      return;
    }
    scheduleAssetSave(themeId);
  }, [nodes, currentId, themeId, roundCount, draftReady, scheduleAssetSave]);

  const backgroundGenerating = useMemo(
    () => THEMES.filter((t) => t.id !== themeId && generatingThemes.has(t.id)),
    [themeId, generatingThemes],
  );

  async function decorate() {
    const tid = themeId;
    const trimmed = (requestByThemeRef.current[tid] ?? '').trim();
    if (!trimmed) {
      setErrorByTheme((prev) => ({ ...prev, [tid]: '先用一句话说说这一轮想怎么装修吧～' }));
      return;
    }

    const themeAtStart = THEMES.find((t) => t.id === tid) ?? THEMES[0];
    const snap = draftRef.current[tid] ?? getThemeState(tid);
    const currentNode = snap.nodes.find((n) => n.id === snap.currentId) ?? snap.nodes[0];
    const nextSeq = snap.nodeSeq + 1;

    setGeneratingThemes((prev) => new Set(prev).add(tid));
    setErrorByTheme((prev) => ({ ...prev, [tid]: '' }));
    setRequestByTheme((prev) => ({ ...prev, [tid]: '' }));
    const themesSnap = buildThemesProgress(
      { ...draftRef.current, [tid]: snap },
      new Set([...generatingThemes, tid]),
      errorByTheme,
    );
    const activeTheme = themesSnap[tid];
    void report({
      status: 'generating',
      themeId: tid,
      themes: themesSnap,
      prompt: trimmed,
      roundCount: snap.nodes.length,
      thumbnailUrl: activeTheme.thumbnailUrl,
    });

    try {
      const prompt = `请在保持画面里${themeAtStart.subject}和房间整体不变的基础上，按要求装修房间：${trimmed}。保持卡通、温馨、适合儿童的风格。`;
      const r = await api.post('/ai-generate/image', {
        prompt,
        saveAsAsset: true,
        title: `${themeAtStart.title}·${trimmed.slice(0, 12)}`,
        references: [{ type: 'image', url: absoluteAssetUrl(currentNode.url) }],
        options: { size: '1K', n: 1 },
      });
      const url = r.data.imageUrls?.[0];
      if (!url) {
        if (themeIdRef.current === tid) {
          setErrorByTheme((prev) => ({ ...prev, [tid]: '没有拿到图片，请重试。' }));
        }
        return;
      }

      const id = `n${nextSeq}`;
      const nextNodes = [...snap.nodes, { id, parentId: currentNode.id, request: trimmed, url }];
      const nextState: ThemeState = {
        nodes: nextNodes,
        currentId: id,
        savedAssetId: snap.savedAssetId,
        nodeSeq: nextSeq,
      };
      draftRef.current[tid] = nextState;
      void saveDecorateRoomThemeDraft(tid, nextState, themeIdRef.current);
      scheduleAssetSave(tid);

      if (themeIdRef.current === tid) {
        applyThemeState(nextState);
      }

      const rounds = nextNodes.length - 1;
      const nextDraft = { ...draftRef.current, [tid]: nextState };
      const themesSnap = buildThemesProgress(
        nextDraft,
        new Set([...generatingThemes].filter((x) => x !== tid)),
        errorByTheme,
      );
      const activeTheme = themesSnap[tid];
      void report({
        status: Object.values(themesSnap).some((t) => t.status === 'generating') ? 'generating' : 'done',
        themeId: tid,
        themes: themesSnap,
        prompt: trimmed,
        imageUrls: activeTheme.imageUrls,
        thumbnailUrl: url,
        roundCount: rounds,
        summary: activeTheme.summary,
        items: activeTheme.items,
      });
    } catch (e: any) {
      const msg = e?.message || '生成失败';
      if (themeIdRef.current === tid) {
        setErrorByTheme((prev) => ({ ...prev, [tid]: msg }));
      }
      const themesSnap = buildThemesProgress(draftRef.current, new Set([...generatingThemes].filter((x) => x !== tid)), {
        ...errorByTheme,
        [tid]: msg,
      });
      const activeTheme = themesSnap[tid];
      void report({
        status: 'failed',
        themeId: tid,
        themes: themesSnap,
        prompt: trimmed,
        error: msg,
        thumbnailUrl: activeTheme.thumbnailUrl,
        roundCount: activeTheme.roundCount,
      });
    } finally {
      setGeneratingThemes((prev) => {
        const next = new Set(prev);
        next.delete(tid);
        return next;
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="kid-card-pink">
        <p className="text-sm font-semibold text-ink-soft leading-relaxed">
          {theme.emoji} 这是{theme.title.replace('的房间', '')}的新家！用文字告诉 AI 想怎么装修。可以一轮一轮改造，也可以<b>点下面任意一版继续装修、长出新的分支</b>。装修分支会<b>自动保存</b>到素材库。切换角色房间时，装修进度会自动保留；<b>AI 装修时也可以先去别的房间看看</b>。
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {THEMES.map((t) => {
          const isActive = t.id === themeId;
          const isGenerating = generatingThemes.has(t.id);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => switchTheme(t.id)}
              className={`kid-button-sm border-2 relative ${isActive ? 'bg-brand text-white border-brand' : 'bg-white text-ink-soft border-orange-200 hover:border-brand'}`}
            >
              {t.emoji} {t.title}
              {isGenerating && (
                <span className={`ml-1 text-[10px] font-bold ${isActive ? 'text-white/90' : 'text-amber-600'}`}>
                  🪄
                </span>
              )}
            </button>
          );
        })}
      </div>

      {backgroundGenerating.length > 0 && (
        <div className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          {backgroundGenerating.map((t) => t.title).join('、')} 还在后台装修，切回去就能看到新图啦～
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="kid-card">
          <div className="text-sm font-bold mb-2">🏠 当前这一版：{current.id === ROOT_ID ? '初始房间' : current.request}</div>
          <div className="aspect-square rounded-2xl border-2 border-orange-100 bg-slate-50 overflow-hidden">
            <img src={resolveUploadPath(current.url)} alt={theme.title} className="w-full h-full object-cover" decoding="async" />
          </div>
        </div>

        <div className="kid-card space-y-3">
          <label className="text-sm font-bold">✏️ 在这一版的基础上，想怎么装修？</label>
          <textarea
            className="kid-textarea"
            value={request}
            onChange={(e) => setRequestByTheme((prev) => ({ ...prev, [themeId]: e.target.value }))}
            placeholder="例如：墙刷成天蓝色，放一个大书架和一盏星星灯"
            disabled={loading}
          />
          <button type="button" onClick={() => void decorate()} disabled={loading} className="kid-button-primary w-full">
            {loading ? '🪄 AI 正在装修…' : '🪄 装修这一轮'}
          </button>
          {loading && <AiProgress label="AI 正在装修房间…" />}
          {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>}
          <AiWarning />
        </div>
      </div>

      <div className="kid-card space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-sm font-bold">🌳 装修分支（点一版可从那一版继续改造）</div>
            <div className="text-xs text-ink-soft mt-0.5">
              已记录 {nodes.length} 个版本 · {roundCount} 轮装修
              {branchPointCount > 0 ? ` · ${branchPointCount} 个分支点` : ''}
              {roundCount > 0 && (
                <span className="ml-1">
                  · {saving ? '正在自动保存…' : saved ? '已自动保存' : '即将自动保存…'}
                </span>
              )}
            </div>
          </div>
        </div>
        {saved && roundCount > 0 && (
          <div className="text-sm bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl px-3 py-2">
            装修分支已自动写入素材库（含每一版和分支关系）。
            <Link href="/student/assets" className="underline font-bold ml-1">去素材库查看 →</Link>
          </div>
        )}
        <Branch nodes={nodes} id={ROOT_ID} currentId={current.id} onSelect={setCurrentId} depth={0} />
      </div>
    </div>
  );
}

const Branch = memo(function Branch({
  nodes,
  id,
  currentId,
  onSelect,
  depth,
}: {
  nodes: RoomNode[];
  id: string;
  currentId: string;
  onSelect: (id: string) => void;
  depth: number;
}) {
  const node = useMemo(() => nodes.find((n) => n.id === id), [nodes, id]);
  const children = useMemo(() => nodes.filter((n) => n.parentId === id), [nodes, id]);
  if (!node) return null;
  const isCurrent = currentId === id;

  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect(id)}
        className={`flex items-center gap-3 text-left rounded-2xl border-2 p-2 w-full max-w-md transition ${
          isCurrent ? 'border-brand bg-orange-50 ring-2 ring-brand/30' : 'border-orange-100 bg-white hover:border-brand'
        }`}
      >
        <img
          src={resolveUploadPath(node.url)}
          alt=""
          loading="lazy"
          decoding="async"
          className="w-14 h-14 rounded-xl object-cover border border-orange-100 shrink-0"
        />
        <div className="min-w-0">
          <div className="text-sm font-bold truncate">{node.id === ROOT_ID ? '🏁 初始房间' : node.request}</div>
          <div className="text-[11px] text-ink-soft">{isCurrent ? '✅ 正在装修这一版' : '点我从这一版继续'}{children.length > 1 ? ` · ${children.length} 个分支` : ''}</div>
        </div>
      </button>

      {children.length > 0 && (
        <div className="mt-2 ml-5 pl-4 border-l-2 border-dashed border-orange-200 space-y-2">
          {children.map((c) => (
            <Branch key={c.id} nodes={nodes} id={c.id} currentId={currentId} onSelect={onSelect} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
});
