'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { VoiceInputButton } from '@/components/voice-input';

export interface WorkCardField {
  key: string;
  label: string;
  emoji: string;
  placeholder: string;
}

const DEFAULT_FIELDS: WorkCardField[] = [
  { key: 'learned', label: '我学会了什么？', emoji: '💡', placeholder: '例如：我学会了用提示词让 AI 画出我想要的画面。' },
  { key: 'made', label: '我完成了什么？', emoji: '🎁', placeholder: '例如：我做了一个奶龙房间和一个会发声音的小交互。' },
  { key: 'future', label: '我未来想做什么？', emoji: '🚀', placeholder: '例如：我想用 AI 做一个帮小动物找家的网站。' },
];

/**
 * 作品卡：引导式输入框 + 语音输入，保存为 text 素材。
 */
export function WorkCard({
  fields = DEFAULT_FIELDS,
  version = '2.0',
  titlePrefix = '我的作品卡',
}: {
  fields?: WorkCardField[];
  version?: string;
  titlePrefix?: string;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function setField(key: string, val: string) {
    setValues((v) => ({ ...v, [key]: val }));
    setSavedId(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const content = fields.map((f) => `【${f.label}】\n${values[f.key]?.trim() || '（未填写）'}`).join('\n\n');
      const r = await api.post('/assets', {
        type: 'text',
        title: `${titlePrefix} ${version}`,
        summary: '课程作品卡',
        content,
        meta: { kind: 'work-card', version, fields: values },
      });
      setSavedId(r.data?.id || 'ok');
    } catch (e: any) {
      setError(e?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {fields.map((f) => (
        <div key={f.key} className="kid-card !p-4 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold flex items-center gap-1.5">
              <span className="text-lg">{f.emoji}</span> {f.label}
            </label>
            <VoiceInputButton onResult={(t) => setField(f.key, (values[f.key] ? values[f.key] + ' ' : '') + t)} />
          </div>
          <textarea
            className="kid-textarea !min-h-[80px]"
            value={values[f.key] || ''}
            onChange={(e) => setField(f.key, e.target.value)}
            placeholder={f.placeholder}
          />
        </div>
      ))}

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="kid-button-primary">
          {saving ? '保存中…' : '💾 保存作品卡'}
        </button>
        {savedId && <span className="text-sm font-bold text-emerald-600">✅ 已保存到「我的素材库」！</span>}
        {error && <span className="text-sm text-rose-600">{error}</span>}
      </div>
    </div>
  );
}
