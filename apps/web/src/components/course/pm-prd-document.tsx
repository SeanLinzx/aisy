'use client';

import { useState } from 'react';
import type { PmPrdFields } from '@/lib/pm-prompts';

const PLACEHOLDER = '（点击填写）';

function EditableBlock({
  label,
  value,
  onChange,
  multiline = true,
  active,
  onFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  active: boolean;
  onFocus: () => void;
}) {
  const empty = !value.trim();
  const cls = `w-full rounded-xl border-2 px-3 py-2 text-sm leading-relaxed transition ${
    active
      ? 'border-brand bg-white ring-2 ring-orange-200'
      : empty
        ? 'border-dashed border-orange-200 bg-orange-50/60 text-ink-soft cursor-text hover:border-orange-300'
        : 'border-transparent bg-transparent hover:border-orange-100 cursor-text'
  }`;

  return (
    <section className="space-y-1.5">
      {label ? (
        <h2 className="text-sm font-extrabold text-ink border-b-2 border-orange-100 pb-1">{label}</h2>
      ) : null}
      {multiline ? (
        <textarea
          className={`${cls} kid-textarea !min-h-[72px] resize-y`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          placeholder={PLACEHOLDER}
          rows={3}
        />
      ) : (
        <input
          className={`${cls} kid-input !py-2 font-display text-xl font-extrabold`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          placeholder={PLACEHOLDER}
        />
      )}
    </section>
  );
}

export function PmPrdDocument({
  prd,
  onChange,
}: {
  prd: PmPrdFields;
  onChange: (next: PmPrdFields) => void;
}) {
  const [activeKey, setActiveKey] = useState<string | null>(null);

  function patch(partial: Partial<PmPrdFields>) {
    onChange({ ...prd, ...partial });
  }

  function setFeature(index: number, text: string) {
    const features = [...(prd.features.length ? prd.features : [''])];
    features[index] = text;
    patch({ features: features.filter((f, i) => f.trim() || i < features.length - 1) });
  }

  function addFeature() {
    patch({ features: [...prd.features, ''] });
    setActiveKey(`feature-${prd.features.length}`);
  }

  function removeFeature(index: number) {
    patch({ features: prd.features.filter((_, i) => i !== index) });
  }

  const features = prd.features.length ? prd.features : [];

  return (
    <article className="pm-prd-doc text-sm leading-relaxed space-y-4 max-h-[440px] overflow-y-auto pr-1">
      <section className="space-y-1 border-b-2 border-orange-100 pb-3">
        <h1 className="text-[11px] font-bold text-ink-soft uppercase tracking-wide">产品名称</h1>
        <input
          className={`w-full kid-input !py-2 font-display text-xl font-extrabold rounded-xl border-2 ${
            activeKey === 'productName'
              ? 'border-brand ring-2 ring-orange-200'
              : !prd.productName.trim()
                ? 'border-dashed border-orange-200 bg-orange-50/60 text-ink-soft'
                : 'border-transparent bg-transparent'
          }`}
          value={prd.productName}
          onChange={(e) => patch({ productName: e.target.value })}
          onFocus={() => setActiveKey('productName')}
          placeholder="（点击填写产品名称）"
        />
      </section>

      <EditableBlock
        label="一句话介绍"
        value={prd.tagline}
        onChange={(tagline) => patch({ tagline })}
        active={activeKey === 'tagline'}
        onFocus={() => setActiveKey('tagline')}
      />

      <EditableBlock
        label="目标用户"
        value={prd.targetUsers}
        onChange={(targetUsers) => patch({ targetUsers })}
        active={activeKey === 'targetUsers'}
        onFocus={() => setActiveKey('targetUsers')}
      />

      <EditableBlock
        label="要解决的问题"
        value={prd.problem}
        onChange={(problem) => patch({ problem })}
        active={activeKey === 'problem'}
        onFocus={() => setActiveKey('problem')}
      />

      <section className="space-y-2">
        <h2 className="text-sm font-extrabold text-ink border-b-2 border-orange-100 pb-1">核心功能</h2>
        <ul className="space-y-2 list-none pl-0">
          {features.length === 0 && (
            <li>
              <button
                type="button"
                className="text-xs font-bold text-brand underline"
                onClick={addFeature}
              >
                + 添加一条功能
              </button>
            </li>
          )}
          {features.map((f, i) => (
            <li key={i} className="flex gap-2 items-start">
              <span className="text-brand font-bold mt-2.5 shrink-0">•</span>
              <textarea
                className={`flex-1 kid-textarea !min-h-[48px] text-sm ${
                  activeKey === `feature-${i}`
                    ? 'border-brand ring-2 ring-orange-200'
                    : !f.trim()
                      ? 'border-dashed border-orange-200 bg-orange-50/60'
                      : 'border-orange-100'
                }`}
                value={f}
                onChange={(e) => setFeature(i, e.target.value)}
                onFocus={() => setActiveKey(`feature-${i}`)}
                placeholder={`功能 ${i + 1}：${PLACEHOLDER}`}
                rows={2}
              />
              {features.length > 1 && (
                <button
                  type="button"
                  className="text-xs text-rose-500 font-bold shrink-0 mt-2"
                  onClick={() => removeFeature(i)}
                  aria-label="删除"
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
        {features.length > 0 && (
          <button type="button" className="text-xs font-bold text-brand underline" onClick={addFeature}>
            + 再加一条功能
          </button>
        )}
      </section>

      <EditableBlock
        label="使用场景"
        value={prd.scenario}
        onChange={(scenario) => patch({ scenario })}
        active={activeKey === 'scenario'}
        onFocus={() => setActiveKey('scenario')}
      />

      {prd.interestArea?.trim() ? (
        <EditableBlock
          label="我感兴趣的领域"
          value={prd.interestArea}
          onChange={(interestArea) => patch({ interestArea })}
          active={activeKey === 'interestArea'}
          onFocus={() => setActiveKey('interestArea')}
        />
      ) : null}

      {prd.aiCapabilities?.trim() ? (
        <EditableBlock
          label="AI 能力"
          value={prd.aiCapabilities}
          onChange={(aiCapabilities) => patch({ aiCapabilities })}
          active={activeKey === 'aiCapabilities'}
          onFocus={() => setActiveKey('aiCapabilities')}
        />
      ) : null}

      {prd.userInput?.trim() ? (
        <EditableBlock
          label="用户需要输入什么"
          value={prd.userInput}
          onChange={(userInput) => patch({ userInput })}
          active={activeKey === 'userInput'}
          onFocus={() => setActiveKey('userInput')}
        />
      ) : null}

      {prd.aiOutput?.trim() ? (
        <EditableBlock
          label="AI 会输出什么"
          value={prd.aiOutput}
          onChange={(aiOutput) => patch({ aiOutput })}
          active={activeKey === 'aiOutput'}
          onFocus={() => setActiveKey('aiOutput')}
        />
      ) : null}

      {prd.htmlScope?.trim() ? (
        <EditableBlock
          label="HTML 页面实现范围"
          value={prd.htmlScope}
          onChange={(htmlScope) => patch({ htmlScope })}
          active={activeKey === 'htmlScope'}
          onFocus={() => setActiveKey('htmlScope')}
        />
      ) : null}

      <p className="text-[11px] text-ink-soft pt-1 border-t border-orange-100">
        💡 点击任意段落即可修改；选择题或 AI 对话会自动更新，你也可以手动改得更满意。
      </p>
    </article>
  );
}
