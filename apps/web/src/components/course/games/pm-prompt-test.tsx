'use client';

import { useEffect, useMemo, useState } from 'react';
import { AiWarning } from '@/components/ai-warning';
import { PmChatPanel } from '@/components/course/pm-chat-panel';
import { useLanguage } from '@/contexts/language-context';
import { generateImageWithQueue } from '@/lib/ai-generate-queue';
import { sendPmChat } from '@/lib/pm-chat-api';
import {
  PM_IMAGE_CONTROL,
  PM_IMAGE_CONTROL_ID,
  PM_IMAGE_TEMPLATES,
  PM_PROMPT_TEST_STORAGE_KEY,
  PM_TASK_SUGGESTIONS,
  PM_TEXT_CONTROL,
  PM_TEXT_CONTROL_ID,
  PM_TEXT_TEMPLATES,
  createCustomImageTemplate,
  createCustomTextTemplate,
  defaultImagePrefixes,
  defaultTextSystems,
  type PmImageTemplate,
  type PmTextTemplate,
} from '@/lib/pm-prompt-templates';
import { PM_SINGLE_REPLY_MAX_CHARS } from '@/lib/pm-chat-limits';
import type { ChatMessage } from '@/lib/pm-pipeline';

function TextTemplatePanel({
  template,
  task,
  system,
  onEditPrompt,
}: {
  template: PmTextTemplate;
  task: string;
  system: string;
  onEditPrompt: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState(task);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setInput(task);
  }, [task]);

  async function send() {
    if (!input.trim() || busy) return;
    const userText = input.trim();
    setInput('');
    setBusy(true);
    setMessages((prev) => [...prev, { role: 'user', content: userText }]);
    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const reply = await sendPmChat({
        prompt: userText,
        system: system.trim() || undefined,
        messages: history,
        maxReplyChars: PM_SINGLE_REPLY_MAX_CHARS,
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="kid-card flex flex-col gap-2 min-h-0 overflow-hidden">
      <div className="shrink-0 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-extrabold text-sm">
            {template.emoji} {template.title}
          </div>
          <p className="text-xs text-ink-soft mt-0.5">{template.desc}</p>
        </div>
        <button type="button" className="text-[11px] font-bold text-violet-600 underline shrink-0" onClick={onEditPrompt}>
          编辑提示词
        </button>
      </div>
      <details className="shrink-0 text-xs group">
        <summary className="cursor-pointer font-bold text-ink-soft hover:text-violet-600 list-none flex items-center gap-1">
          <span className="group-open:rotate-90 transition-transform inline-block">▸</span>
          查看当前系统提示词
        </summary>
        <p className="mt-1.5 p-2 rounded-lg bg-violet-50 border border-violet-100 text-ink-soft leading-relaxed whitespace-pre-wrap">
          {system.trim() ? system : '（无系统提示词 — 对照组）'}
        </p>
      </details>
      <div className="flex-1 min-h-[280px] h-[280px] overflow-hidden">
        <PmChatPanel
          embedded
          messages={messages}
          input={input}
          onInputChange={setInput}
          onSend={send}
          busy={busy}
          placeholder="改改任务或接着聊…"
          emptyHint="发一条任务，看看这位 AI 会怎么接招 🎤"
        />
      </div>
    </div>
  );
}

function ImageTemplatePanel({
  template,
  task,
  prefix,
  onEditPrompt,
}: {
  template: PmImageTemplate;
  task: string;
  prefix: string;
  onEditPrompt: () => void;
}) {
  const [prompt, setPrompt] = useState(task);
  const [urls, setUrls] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPrompt(task);
  }, [task]);

  async function generate() {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const fullPrompt = prefix.trim() ? `${prefix.trim()}${prompt.trim()}` : prompt.trim();
      const r = await generateImageWithQueue({ prompt: fullPrompt, title: template.title });
      setUrls(r.imageUrls || []);
    } catch (e: unknown) {
      setError((e as Error)?.message || '生图失败');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="kid-card space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-extrabold text-sm">
            {template.emoji} {template.title}
          </div>
          <p className="text-xs text-ink-soft">{template.desc}</p>
        </div>
        <button type="button" className="text-[11px] font-bold text-violet-600 underline shrink-0" onClick={onEditPrompt}>
          编辑提示词
        </button>
      </div>
      <details className="text-xs group">
        <summary className="cursor-pointer font-bold text-ink-soft hover:text-violet-600 list-none flex items-center gap-1">
          <span className="group-open:rotate-90 transition-transform inline-block">▸</span>
          查看画家的风格提示词
        </summary>
        <p className="mt-1.5 p-2 rounded-lg bg-violet-50 border border-violet-100 text-ink-soft leading-relaxed whitespace-pre-wrap">
          {prefix.trim() ? prefix : '（无风格提示词 — 对照组，仅使用任务描述）'}
        </p>
      </details>
      <textarea className="kid-textarea !min-h-[64px] text-sm" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
      <button type="button" className="kid-button-primary !py-1.5 !px-3 text-xs w-full" onClick={generate} disabled={busy}>
        {busy ? '画家正在挥笔…' : '🎨 生成图片'}
      </button>
      {error && <p className="text-xs text-rose-600">{error}</p>}
      {urls[0] && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={urls[0]} alt="" className="w-full rounded-xl border-2 border-orange-100" />
      )}
    </div>
  );
}

function PromptEditor({
  title,
  emoji,
  value,
  onChange,
  onReset,
  hint,
  label = '系统提示词',
  placeholder = '在这里编写系统提示词…',
  isControl = false,
}: {
  title: string;
  emoji: string;
  value: string;
  onChange: (v: string) => void;
  onReset: () => void;
  hint: string;
  label?: string;
  placeholder?: string;
  isControl?: boolean;
}) {
  return (
    <div className="kid-card-purple space-y-2 !p-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="font-extrabold text-sm">
          {emoji} {title} · {label}
        </div>
        {!isControl && (
          <button type="button" className="text-xs font-bold text-ink-soft underline hover:text-violet-700" onClick={onReset}>
            恢复默认
          </button>
        )}
      </div>
      <p className="text-xs text-ink-soft">{hint}</p>
      <textarea
        className="kid-textarea !min-h-[100px] text-sm w-full font-mono leading-relaxed"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={isControl ? '对照组保持为空，不要填写' : placeholder}
        readOnly={isControl}
      />
    </div>
  );
}

function AddTemplateChip({
  label,
  onAdd,
}: {
  label: string;
  onAdd: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  function confirm() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setName('');
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs px-3 py-1.5 rounded-xl border-2 border-dashed border-violet-300 bg-violet-50 text-violet-700 font-bold hover:bg-violet-100"
      >
        ➕ {label}
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-xl border-2 border-violet-400 bg-white p-1">
      <input
        className="kid-input !py-1 !px-2 text-xs w-28"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="起个名字"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') confirm();
          if (e.key === 'Escape') setOpen(false);
        }}
      />
      <button type="button" className="text-xs font-bold text-violet-600 px-2" onClick={confirm}>
        添加
      </button>
      <button type="button" className="text-xs text-slate-400 px-1" onClick={() => setOpen(false)}>
        ✕
      </button>
    </div>
  );
}

function TemplateChip({
  template,
  selected,
  editing,
  onToggle,
  onSelect,
  onRemove,
}: {
  template: PmTextTemplate | PmImageTemplate;
  selected: boolean;
  editing: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onRemove?: () => void;
}) {
  return (
    <div
      className={`inline-flex items-stretch rounded-xl border-2 overflow-hidden ${
        editing ? 'border-violet-600 ring-2 ring-violet-200' : selected ? 'border-violet-400' : 'border-orange-100'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className={`px-2 text-xs font-bold ${selected ? 'bg-violet-500 text-white' : 'bg-white text-ink-soft'}`}
        title={selected ? '取消对比' : '加入对比'}
      >
        {selected ? '✓' : '+'}
      </button>
      <button
        type="button"
        onClick={onSelect}
        className={`text-xs px-3 py-1.5 font-bold ${selected ? 'bg-violet-50 text-violet-900' : 'bg-white'}`}
      >
        {template.emoji} {template.title}
      </button>
      {onRemove && (
        <button type="button" onClick={onRemove} className="px-2 text-xs text-rose-500 bg-white hover:bg-rose-50" title="删除">
          ✕
        </button>
      )}
    </div>
  );
}

export function PmPromptTestGame() {
  const { tx } = useLanguage();
  const [tab, setTab] = useState<'text' | 'image'>('text');
  const [textTask, setTextTask] = useState(PM_TASK_SUGGESTIONS.text[0]);
  const [imageTask, setImageTask] = useState(PM_TASK_SUGGESTIONS.image[0]);
  const [selectedText, setSelectedText] = useState<string[]>(['strict-teacher', PM_TEXT_CONTROL_ID]);
  const [selectedImage, setSelectedImage] = useState<string[]>(['cartoon', PM_IMAGE_CONTROL_ID]);
  const [textSystems, setTextSystems] = useState(defaultTextSystems);
  const [imagePrefixes, setImagePrefixes] = useState(defaultImagePrefixes);
  const [customTextTemplates, setCustomTextTemplates] = useState<PmTextTemplate[]>([]);
  const [customImageTemplates, setCustomImageTemplates] = useState<PmImageTemplate[]>([]);
  const [editingTextId, setEditingTextId] = useState<string | null>('strict-teacher');
  const [editingImageId, setEditingImageId] = useState<string | null>('cartoon');

  const allTextTemplates = useMemo(
    () => [...PM_TEXT_TEMPLATES, PM_TEXT_CONTROL, ...customTextTemplates],
    [customTextTemplates],
  );
  const allImageTemplates = useMemo(
    () => [...PM_IMAGE_TEMPLATES, PM_IMAGE_CONTROL, ...customImageTemplates],
    [customImageTemplates],
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PM_PROMPT_TEST_STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as {
        textSystems?: Record<string, string>;
        imagePrefixes?: Record<string, string>;
        customTextTemplates?: PmTextTemplate[];
        customImageTemplates?: PmImageTemplate[];
        selectedText?: string[];
        selectedImage?: string[];
      };
      if (data.textSystems) setTextSystems((prev) => ({ ...prev, ...data.textSystems }));
      if (data.imagePrefixes) setImagePrefixes((prev) => ({ ...prev, ...data.imagePrefixes }));
      if (data.customTextTemplates?.length) setCustomTextTemplates(data.customTextTemplates);
      if (data.customImageTemplates?.length) setCustomImageTemplates(data.customImageTemplates);
      if (data.selectedText?.length) setSelectedText(data.selectedText);
      if (data.selectedImage?.length) setSelectedImage(data.selectedImage);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      PM_PROMPT_TEST_STORAGE_KEY,
      JSON.stringify({
        textSystems,
        imagePrefixes,
        customTextTemplates,
        customImageTemplates,
        selectedText,
        selectedImage,
      }),
    );
  }, [textSystems, imagePrefixes, customTextTemplates, customImageTemplates, selectedText, selectedImage]);

  function toggleId(list: string[], id: string, set: (v: string[]) => void) {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  function selectTextTemplate(id: string) {
    if (!selectedText.includes(id)) {
      setSelectedText((prev) => [...prev, id]);
    }
    setEditingTextId(id);
  }

  function selectImageTemplate(id: string) {
    if (!selectedImage.includes(id)) {
      setSelectedImage((prev) => [...prev, id]);
    }
    setEditingImageId(id);
  }

  function addCustomText(name: string) {
    const t = createCustomTextTemplate(name);
    setCustomTextTemplates((prev) => [...prev, t]);
    setTextSystems((prev) => ({ ...prev, [t.id]: t.system }));
    setSelectedText((prev) => (prev.includes(t.id) ? prev : [...prev, t.id]));
    setEditingTextId(t.id);
  }

  function addCustomImage(name: string) {
    const t = createCustomImageTemplate(name);
    setCustomImageTemplates((prev) => [...prev, t]);
    setImagePrefixes((prev) => ({ ...prev, [t.id]: t.prefix }));
    setSelectedImage((prev) => (prev.includes(t.id) ? prev : [...prev, t.id]));
    setEditingImageId(t.id);
  }

  function removeCustomText(id: string) {
    setCustomTextTemplates((prev) => prev.filter((t) => t.id !== id));
    setSelectedText((prev) => prev.filter((x) => x !== id));
    setTextSystems((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (editingTextId === id) setEditingTextId(PM_TEXT_CONTROL_ID);
  }

  function removeCustomImage(id: string) {
    setCustomImageTemplates((prev) => prev.filter((t) => t.id !== id));
    setSelectedImage((prev) => prev.filter((x) => x !== id));
    setImagePrefixes((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (editingImageId === id) setEditingImageId(PM_IMAGE_CONTROL_ID);
  }

  const textTemplates = allTextTemplates.filter((t) => selectedText.includes(t.id));
  const imageTemplates = allImageTemplates.filter((t) => selectedImage.includes(t.id));

  const editingTextTemplate = useMemo(
    () => allTextTemplates.find((t) => t.id === editingTextId),
    [allTextTemplates, editingTextId],
  );
  const editingImageTemplate = useMemo(
    () => allImageTemplates.find((t) => t.id === editingImageId),
    [allImageTemplates, editingImageId],
  );

  return (
    <div className="space-y-4">
      <div className="kid-card-purple">
        <div className="font-extrabold text-lg">🧪 {tx('AI 系统提示词测试')}</div>
        <p className="text-sm text-ink-soft mt-1">
          同一个任务，交给不同「角色」或「画家」——就像给 AI 换面具、换画笔，看看回答和图片有什么不一样。
          <span className="block mt-1 text-violet-700 font-semibold">
            💡 生文对比默认每次 {PM_SINGLE_REPLY_MAX_CHARS} 字以内；下面有很多好玩案例，点一下就换任务。
          </span>
        </p>
      </div>

      <AiWarning />

      <div className="flex gap-2">
        <button
          type="button"
          className={`rounded-xl px-4 py-2 text-sm font-bold border-2 ${tab === 'text' ? 'border-violet-500 bg-violet-500 text-white' : 'border-orange-100 bg-white'}`}
          onClick={() => setTab('text')}
        >
          📝 生文实验室
        </button>
        <button
          type="button"
          className={`rounded-xl px-4 py-2 text-sm font-bold border-2 ${tab === 'image' ? 'border-violet-500 bg-violet-500 text-white' : 'border-orange-100 bg-white'}`}
          onClick={() => setTab('image')}
        >
          🖼️ 生图画廊
        </button>
      </div>

      {tab === 'text' && (
        <div className="space-y-3">
          <div className="kid-card-sky space-y-2">
            <label className="text-xs font-bold">🎯 今天要 AI 写什么？</label>
            <input className="kid-input w-full" value={textTask} onChange={(e) => setTextTask(e.target.value)} placeholder="也可以自己编一个更离谱的任务…" />
            <p className="text-[11px] text-sky-800/80 font-semibold">灵感快选（点一下填入）：</p>
            <div className="flex flex-wrap gap-1.5">
              {PM_TASK_SUGGESTIONS.text.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="text-xs px-2.5 py-1 rounded-lg border border-sky-200 bg-white hover:bg-sky-50 hover:border-sky-300 transition"
                  onClick={() => setTextTask(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="text-xs font-bold">选几位「生文角色」同台竞技（含 🧪 对照组，也可 ➕ 自创角色）</div>
          <div className="flex flex-wrap gap-2 items-center">
            {allTextTemplates.map((t) => (
              <TemplateChip
                key={t.id}
                template={t}
                selected={selectedText.includes(t.id)}
                editing={editingTextId === t.id}
                onToggle={() => toggleId(selectedText, t.id, setSelectedText)}
                onSelect={() => selectTextTemplate(t.id)}
                onRemove={t.custom ? () => removeCustomText(t.id) : undefined}
              />
            ))}
            <AddTemplateChip label="添加角色" onAdd={addCustomText} />
          </div>

          {editingTextTemplate && editingTextId && (
            <PromptEditor
              title={editingTextTemplate.title}
              emoji={editingTextTemplate.emoji}
              value={textSystems[editingTextId] ?? editingTextTemplate.system}
              onChange={(v) => setTextSystems((prev) => ({ ...prev, [editingTextId]: v }))}
              onReset={() =>
                setTextSystems((prev) => ({ ...prev, [editingTextId]: editingTextTemplate.system }))
              }
              hint={
                editingTextId === PM_TEXT_CONTROL_ID
                  ? '对照组不加人设，方便看看「裸奔的 AI」和加了系统提示词时差多少。'
                  : '系统提示词 = AI 的「人设说明书」。改一改，再发同一个任务，对比谁更有趣、谁更靠谱。'
              }
              isControl={editingTextId === PM_TEXT_CONTROL_ID}
            />
          )}

          <div className="grid md:grid-cols-2 gap-4 items-stretch">
            {textTemplates.map((t) => (
              <TextTemplatePanel
                key={t.id}
                template={t}
                task={textTask}
                system={textSystems[t.id] ?? t.system}
                onEditPrompt={() => setEditingTextId(t.id)}
              />
            ))}
          </div>
        </div>
      )}

      {tab === 'image' && (
        <div className="space-y-3">
          <div className="kid-card-sky space-y-2">
            <label className="text-xs font-bold">🖼️ 今天要画什么？</label>
            <input className="kid-input w-full" value={imageTask} onChange={(e) => setImageTask(e.target.value)} placeholder="描述越具体，画家越能 get 到你的点…" />
            <p className="text-[11px] text-sky-800/80 font-semibold">灵感快选（点一下填入）：</p>
            <div className="flex flex-wrap gap-1.5">
              {PM_TASK_SUGGESTIONS.image.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="text-xs px-2.5 py-1 rounded-lg border border-sky-200 bg-white hover:bg-sky-50 hover:border-sky-300 transition"
                  onClick={() => setImageTask(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="text-xs font-bold">选几位「画家」同题 PK（含 🧪 对照组，也可 ➕ 自创画风）</div>
          <div className="flex flex-wrap gap-2 items-center">
            {allImageTemplates.map((t) => (
              <TemplateChip
                key={t.id}
                template={t}
                selected={selectedImage.includes(t.id)}
                editing={editingImageId === t.id}
                onToggle={() => toggleId(selectedImage, t.id, setSelectedImage)}
                onSelect={() => selectImageTemplate(t.id)}
                onRemove={t.custom ? () => removeCustomImage(t.id) : undefined}
              />
            ))}
            <AddTemplateChip label="添加画家" onAdd={addCustomImage} />
          </div>

          {editingImageTemplate && editingImageId && (
            <PromptEditor
              title={editingImageTemplate.title}
              emoji={editingImageTemplate.emoji}
              value={imagePrefixes[editingImageId] ?? editingImageTemplate.prefix}
              onChange={(v) => setImagePrefixes((prev) => ({ ...prev, [editingImageId]: v }))}
              onReset={() =>
                setImagePrefixes((prev) => ({ ...prev, [editingImageId]: editingImageTemplate.prefix }))
              }
              hint={
                editingImageId === PM_IMAGE_CONTROL_ID
                  ? '对照组不加画风滤镜——同样的描述，看看「原味 AI」和其他画家差在哪。'
                  : '这位画家会在你的描述前面加一段「画风咒语」，就像给画面加滤镜。'
              }
              label="风格提示词"
              placeholder="例如：像素风、赛博朋克、毛茸茸、像贴纸一样…"
              isControl={editingImageId === PM_IMAGE_CONTROL_ID}
            />
          )}

          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {imageTemplates.map((t) => (
              <ImageTemplatePanel
                key={t.id}
                template={t}
                task={imageTask}
                prefix={imagePrefixes[t.id] ?? t.prefix}
                onEditPrompt={() => setEditingImageId(t.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
