'use client';

import { memo, useCallback, useMemo, useState } from 'react';
import {
  countBranchPoints,
  versionChildren,
  versionEditableText,
  versionFullPrompt,
  versionLabel,
  versionRoots,
  type WebProjectVersionRow,
} from '@/lib/web-project-versions';
import { patchWebProjectVersion, updateVersionTreeNotes } from '@/lib/web-project-version-patch';
import { useLanguage } from '@/contexts/language-context';

const VersionBranch = memo(function VersionBranch({
  versions,
  id,
  currentId,
  editingId,
  draftNotes,
  draftPrompt,
  saving,
  onSelect,
  onStartEdit,
  onDraftNotesChange,
  onDraftPromptChange,
  onSave,
  onCancel,
}: {
  versions: WebProjectVersionRow[];
  id: string;
  currentId: string;
  editingId: string | null;
  draftNotes: string;
  draftPrompt: string;
  saving: boolean;
  onSelect: (id: string) => void;
  onStartEdit: (id: string) => void;
  onDraftNotesChange: (v: string) => void;
  onDraftPromptChange: (v: string) => void;
  onSave: (id: string) => void;
  onCancel: () => void;
}) {
  const { tx } = useLanguage();
  const node = useMemo(() => versions.find((v) => v.id === id), [versions, id]);
  const children = useMemo(() => versionChildren(versions, id), [versions, id]);
  if (!node) return null;
  const isCurrent = currentId === id;
  const isEditing = editingId === id;

  return (
    <div>
      <div
        className={`rounded-xl border-2 transition ${
          isCurrent ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-200' : 'border-orange-100 bg-white hover:border-violet-200'
        }`}
      >
        <button
          type="button"
          onClick={() => onSelect(id)}
          className="flex items-start gap-2 text-left p-2 w-full"
        >
          <span className="text-lg shrink-0 mt-0.5">{node.version === 1 ? '🏁' : '📄'}</span>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-extrabold text-ink">
              v{node.version} · {versionLabel(node)}
            </div>
            <div className="text-[10px] text-ink-soft mt-0.5">
              {isCurrent ? tx('✅ 正在编辑这一版') : tx('点我回溯到这一版继续改')}
              {children.length > 1 ? ` · ${children.length} ${tx('个分支')}` : ''}
            </div>
          </div>
        </button>

        {isEditing ? (
          <div className="px-2 pb-2 space-y-1.5 border-t border-violet-100/80 pt-2" onClick={(e) => e.stopPropagation()}>
            <label className="block text-[10px] font-bold text-violet-700">{tx('这版改了什么（版本说明）')}</label>
            <textarea
              className="kid-textarea !min-h-[56px] !text-[11px] w-full"
              value={draftNotes}
              onChange={(e) => onDraftNotesChange(e.target.value)}
              placeholder={tx('例如：修复生成按钮无法点击的问题')}
            />
            <label className="block text-[10px] font-bold text-violet-700">{tx('完整 AI 提示词（高级，可选）')}</label>
            <textarea
              className="kid-textarea !min-h-[72px] !text-[10px] w-full font-mono leading-relaxed"
              value={draftPrompt}
              onChange={(e) => onDraftPromptChange(e.target.value)}
              placeholder={tx('发给 AI 的完整 prompt；留空则仅保存版本说明')}
            />
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                className="kid-button-primary !py-1 !px-2.5 text-[10px]"
                disabled={saving}
                onClick={() => onSave(id)}
              >
                {saving ? tx('保存中…') : tx('💾 保存')}
              </button>
              <button type="button" className="kid-button-ghost !py-1 !px-2.5 text-[10px]" onClick={onCancel}>
                {tx('取消')}
              </button>
            </div>
          </div>
        ) : (
          <div className="px-2 pb-2">
            <button
              type="button"
              className="text-[10px] font-bold text-violet-600 underline hover:text-violet-800"
              onClick={(e) => {
                e.stopPropagation();
                onStartEdit(id);
              }}
            >
              ✏️ {tx('编辑版本说明')}
            </button>
          </div>
        )}
      </div>
      {children.length > 0 && (
        <div className="mt-1.5 ml-4 pl-3 border-l-2 border-dashed border-violet-200 space-y-1.5">
          {children.map((c) => (
            <VersionBranch
              key={c.id}
              versions={versions}
              id={c.id}
              currentId={currentId}
              editingId={editingId}
              draftNotes={draftNotes}
              draftPrompt={draftPrompt}
              saving={saving}
              onSelect={onSelect}
              onStartEdit={onStartEdit}
              onDraftNotesChange={onDraftNotesChange}
              onDraftPromptChange={onDraftPromptChange}
              onSave={onSave}
              onCancel={onCancel}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export function WebVersionTree({
  versions,
  currentId,
  onSelect,
  embedded = false,
  projectId,
  onVersionsChange,
}: {
  versions: WebProjectVersionRow[];
  currentId: string | null;
  onSelect: (id: string) => void;
  embedded?: boolean;
  projectId?: string | null;
  onVersionsChange?: (next: WebProjectVersionRow[]) => void;
}) {
  const { tx } = useLanguage();
  const roots = useMemo(() => versionRoots(versions), [versions]);
  const branchPoints = useMemo(() => countBranchPoints(versions), [versions]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftNotes, setDraftNotes] = useState('');
  const [draftPrompt, setDraftPrompt] = useState('');
  const [saving, setSaving] = useState(false);

  const startEdit = useCallback(
    (id: string) => {
      const v = versions.find((x) => x.id === id);
      if (!v) return;
      setEditingId(id);
      setDraftNotes(versionEditableText(v));
      setDraftPrompt(versionFullPrompt(v));
    },
    [versions],
  );

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setDraftNotes('');
    setDraftPrompt('');
  }, []);

  const saveEdit = useCallback(
    async (id: string) => {
      if (!onVersionsChange) {
        cancelEdit();
        return;
      }
      setSaving(true);
      try {
        let next = await updateVersionTreeNotes({
          projectId,
          versions,
          versionId: id,
          text: draftNotes,
        });
        const trimmedPrompt = draftPrompt.trim();
        const prevPrompt = versionFullPrompt(next.find((x) => x.id === id)!);
        if (trimmedPrompt !== prevPrompt) {
          if (projectId) {
            const saved = await patchWebProjectVersion(projectId, id, { prompt: trimmedPrompt });
            next = next.map((row) => (row.id === id ? { ...row, ...saved } : row));
          } else {
            next = next.map((row) => (row.id === id ? { ...row, prompt: trimmedPrompt } : row));
          }
        }
        onVersionsChange(next);
        cancelEdit();
      } finally {
        setSaving(false);
      }
    },
    [cancelEdit, draftNotes, draftPrompt, onVersionsChange, projectId, versions],
  );

  if (versions.length === 0) return null;

  return (
    <div
      className={
        embedded
          ? 'space-y-2 border-b-2 border-violet-200/80 pb-3 mb-1'
          : 'kid-card-purple !p-3 space-y-2'
      }
    >
      <div className="text-xs font-extrabold text-ink">
        🌳 {tx('修改版本树')}
        <span className="font-semibold text-ink-soft ml-1">
          ({versions.length} {tx('个版本')}
          {branchPoints > 0 ? ` · ${branchPoints} ${tx('个分支点')}` : ''})
        </span>
      </div>
      <p className="text-[10px] text-ink-soft leading-relaxed">
        {tx('每次修改都会保存为新版本。点版本可回溯预览；点「编辑版本说明」可改这版的描述和 AI 提示词。')}
      </p>
      <div className="space-y-1.5 max-h-56 overflow-auto pr-1">
        {roots.map((r) => (
          <VersionBranch
            key={r.id}
            versions={versions}
            id={r.id}
            currentId={currentId ?? r.id}
            editingId={editingId}
            draftNotes={draftNotes}
            draftPrompt={draftPrompt}
            saving={saving}
            onSelect={onSelect}
            onStartEdit={startEdit}
            onDraftNotesChange={setDraftNotes}
            onDraftPromptChange={setDraftPrompt}
            onSave={saveEdit}
            onCancel={cancelEdit}
          />
        ))}
      </div>
    </div>
  );
}
