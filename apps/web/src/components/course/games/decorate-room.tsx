'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { resolveUploadPath } from '@/lib/upload-url';
import { AiWarning } from '@/components/ai-warning';
import { VoiceInputButton } from '@/components/voice-input';
import { AiProgress } from '@/components/course/ai-progress';
import { absoluteAssetUrl, assetPath } from '@/lib/asset-path';
import { useReportGameProgress } from '@/hooks/use-report-game-progress';
import { reportGrowth } from '@/lib/growth-report';

interface RoomNode {
  id: string;
  parentId: string | null;
  request: string;
  url: string;
}

// 所有用户共用的固定初始图（奶龙的空房间）
const BASE_IMAGE = assetPath('/nailong-room.png');
const ROOT_ID = 'root';

let nodeSeq = 0;

export function DecorateRoomGame() {
  const report = useReportGameProgress('decorate-room');
  const [request, setRequest] = useState('');
  const [nodes, setNodes] = useState<RoomNode[]>([
    { id: ROOT_ID, parentId: null, request: '奶龙的空房间', url: BASE_IMAGE },
  ]);
  const [currentId, setCurrentId] = useState<string>(ROOT_ID);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedAssetId, setSavedAssetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const current = useMemo(() => nodes.find((n) => n.id === currentId) ?? nodes[0], [nodes, currentId]);
  const roundCount = nodes.length - 1;
  const branchPointCount = useMemo(() => {
    return nodes.filter((n) => nodes.filter((c) => c.parentId === n.id).length > 1).length;
  }, [nodes]);

  function buildTreeMeta() {
    return {
      kind: 'decorate-room',
      version: 1,
      currentId,
      nodes: nodes.map((n) => ({
        id: n.id,
        parentId: n.parentId,
        request: n.request,
        url: n.url,
      })),
    };
  }

  async function saveRecord() {
    if (roundCount === 0) {
      setError('还没有装修过呢，先试试装修一轮吧～');
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const summary = branchPointCount > 0
        ? `共 ${roundCount} 轮装修，${branchPointCount} 个分支点，${nodes.length} 个版本`
        : `共 ${roundCount} 轮装修，${nodes.length} 个版本`;
      const payload = {
        type: 'mixed' as const,
        title: '奶龙装修记录',
        summary,
        content: JSON.stringify(buildTreeMeta(), null, 2),
        url: current.url,
        thumbnailUrl: current.url,
        meta: buildTreeMeta(),
      };
      if (savedAssetId) {
        await api.patch(`/assets/${savedAssetId}`, payload);
      } else {
        const r = await api.post('/assets', payload);
        setSavedAssetId(r.data.id);
      }
      setSaved(true);
      reportGrowth({
        kind: 'creation',
        gameSlug: 'decorate-room',
        title: '🐉 给奶龙装修房间',
        summary,
        mediaUrl: current.url,
      });
    } catch (e: any) {
      setError(e?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function decorate() {
    if (!request.trim()) {
      setError('先用一句话说说这一轮想怎么装修吧～');
      return;
    }
    setLoading(true);
    setError(null);
    void report({ status: 'generating', prompt: request.trim(), roundCount: roundCount + 1 });
    try {
      const prompt = `请在保持画面里那只圆润的奶黄色小恐龙和房间整体不变的基础上，按要求装修房间：${request.trim()}。保持卡通、温馨、适合儿童的风格。`;
      const r = await api.post('/ai-generate/image', {
        prompt,
        saveAsAsset: true,
        title: `奶龙的房间·${request.trim().slice(0, 12)}`,
        references: [{ type: 'image', url: absoluteAssetUrl(current.url) }],
        options: { size: '1K', n: 1 },
      });
      const url = r.data.imageUrls?.[0];
      if (!url) {
        setError('没有拿到图片，请重试。');
        return;
      }
      const id = `n${++nodeSeq}`;
      const trimmed = request.trim();
      const nextNodes = [...nodes, { id, parentId: current.id, request: trimmed, url }];
      setNodes(nextNodes);
      setCurrentId(id);
      setRequest('');
      setSaved(false);
      const rounds = nextNodes.length - 1;
      void report({
        status: 'done',
        prompt: trimmed,
        imageUrls: nextNodes.filter((n) => n.id !== ROOT_ID).map((n) => n.url),
        thumbnailUrl: url,
        roundCount: rounds,
        summary: `已装修 ${rounds} 轮`,
        items: nextNodes
          .filter((n) => n.id !== ROOT_ID)
          .map((n, idx) => ({ url: n.url, prompt: n.request, label: `第 ${idx + 1} 轮` })),
      });
    } catch (e: any) {
      const msg = e?.message || '生成失败';
      setError(msg);
      void report({ status: 'failed', prompt: request.trim(), error: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="kid-card-pink">
        <p className="text-sm font-semibold text-ink-soft leading-relaxed">
          🐉 这是奶龙的新家！用语音或文字告诉 AI 想怎么装修。可以一轮一轮改造，也可以<b>点下面任意一版继续装修、长出新的分支</b>。满意后点「保存装修记录」，会把<b>整个分支树</b>存进素材库。
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* 左：当前房间 */}
        <div className="kid-card">
          <div className="text-sm font-bold mb-2">🏠 当前这一版：{current.id === ROOT_ID ? '初始房间' : current.request}</div>
          <div className="aspect-square rounded-2xl border-2 border-orange-100 bg-slate-50 overflow-hidden">
            <img src={resolveUploadPath(current.url)} alt="奶龙的房间" className="w-full h-full object-cover" />
          </div>
        </div>

        {/* 右：装修输入 */}
        <div className="kid-card space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold">✏️ 在这一版的基础上，想怎么装修？</label>
            <VoiceInputButton onResult={(t) => setRequest((p) => (p ? p + ' ' : '') + t)} />
          </div>
          <textarea
            className="kid-textarea"
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            placeholder="例如：墙刷成天蓝色，放一个大书架和一盏星星灯"
          />
          <button onClick={decorate} disabled={loading} className="kid-button-primary w-full">
            {loading ? '🪄 AI 正在装修…' : '🪄 装修这一轮'}
          </button>
          {loading && <AiProgress label="AI 正在装修房间…" />}
          {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>}
          <AiWarning />
        </div>
      </div>

      {/* 改造分支树 */}
      <div className="kid-card space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-sm font-bold">🌳 装修分支（点一版可从那一版继续改造）</div>
            <div className="text-xs text-ink-soft mt-0.5">
              已记录 {nodes.length} 个版本 · {roundCount} 轮装修
              {branchPointCount > 0 ? ` · ${branchPointCount} 个分支点` : ''}
            </div>
          </div>
          <button
            onClick={saveRecord}
            disabled={saving || roundCount === 0}
            className="kid-button-sm bg-emerald-100 text-emerald-800 border-2 border-emerald-200 disabled:opacity-50 shrink-0"
          >
            {saving ? '保存中…' : saved ? '✅ 已保存' : '💾 保存装修记录'}
          </button>
        </div>
        {saved && (
          <div className="text-sm bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl px-3 py-2">
            整个装修分支已写入素材库（含每一版和分支关系）。
            <Link href="/student/assets" className="underline font-bold ml-1">去素材库查看 →</Link>
          </div>
        )}
        <Branch nodes={nodes} id={ROOT_ID} currentId={current.id} onSelect={setCurrentId} depth={0} />
      </div>
    </div>
  );
}

function Branch({
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
  const node = nodes.find((n) => n.id === id);
  if (!node) return null;
  const children = nodes.filter((n) => n.parentId === id);
  const isCurrent = currentId === id;

  return (
    <div>
      <button
        onClick={() => onSelect(id)}
        className={`flex items-center gap-3 text-left rounded-2xl border-2 p-2 w-full max-w-md transition ${
          isCurrent ? 'border-brand bg-orange-50 ring-2 ring-brand/30' : 'border-orange-100 bg-white hover:border-brand'
        }`}
      >
        <img src={resolveUploadPath(node.url)} alt="" className="w-14 h-14 rounded-xl object-cover border border-orange-100 shrink-0" />
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
}
