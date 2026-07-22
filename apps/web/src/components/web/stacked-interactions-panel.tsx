'use client';

import {
  interactionRuleSentence,
  type InteractionLayerSpec,
} from '@/components/course/games/mini-interaction-templates';

export function StackedInteractionsPanel({
  layers,
  compact = false,
}: {
  layers: InteractionLayerSpec[];
  compact?: boolean;
}) {
  if (layers.length === 0) return null;

  return (
    <div className="kid-card rounded-2xl bg-emerald-50/90 border-2 border-emerald-100 px-4 py-3 space-y-2">
      <div className="text-sm font-bold text-emerald-800">✅ 已叠加的交互（{layers.length} 条）</div>
      <div className={compact ? 'space-y-2' : 'grid sm:grid-cols-2 lg:grid-cols-3 gap-2'}>
        {layers.map((layer, index) => (
          <div
            key={`${layer.target}-${layer.trigger}-${index}`}
            className="rounded-xl bg-white/80 border border-emerald-100 px-3 py-2 text-xs text-emerald-900 leading-relaxed break-words whitespace-normal"
          >
            {index + 1}. {interactionRuleSentence(layer)}
          </div>
        ))}
      </div>
    </div>
  );
}
