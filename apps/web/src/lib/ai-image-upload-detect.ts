import type { AiFlowGraph, AiFlowNodeType, PmSingleAiConfig } from '@/lib/pm-pipeline';

/** AI 输入方式：文字输入 vs 需要先上传图片（图生文 / 图生图 / 图生视频） */
export type AiInputMode = 'text' | 'image';

export function aiInputModeLabel(type: AiFlowNodeType, mode: AiInputMode): string {
  if (mode === 'image') {
    if (type === 'text') return '图生文';
    if (type === 'image') return '图生图';
    return '图生视频';
  }
  if (type === 'text') return '文生文';
  if (type === 'image') return '文生图';
  return '文生视频';
}

export function singleAiNeedsImageUpload(ai: PmSingleAiConfig): boolean {
  return ai.inputMode === 'image';
}

export function flowNeedsImageUpload(flow: AiFlowGraph): boolean {
  return flow.nodes.some((n) => n.inputMode === 'image');
}

export function resolveEnableImageUpload(opts: {
  singleAi?: PmSingleAiConfig;
  aiFlow?: AiFlowGraph;
  legacyFlag?: boolean;
}): boolean {
  if (opts.singleAi && singleAiNeedsImageUpload(opts.singleAi)) return true;
  if (opts.aiFlow && flowNeedsImageUpload(opts.aiFlow)) return true;
  return opts.legacyFlag === true;
}
