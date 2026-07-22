import { wantsAiFeatures } from '@ai-camp/types';
import { generateWebWithQueue } from '@/lib/ai-generate-queue';
import { mergeWebHtml } from '@/lib/merge-web-html';
import type { IterationChatMessage } from '@/lib/web-iteration-history';
import {
  buildIterationRecoveryPrompt,
  ensureIterationAiCapabilities,
  isLikelyBrokenIteration,
  salvageIterationResult,
} from '@/lib/web-iteration-base';

const DEFAULT_RECOVERY_RULES =
  '4. 新增 AI 生文/生图/生视频时只用 data-ai-action 声明式属性，img/video 的 src 留空，禁止 mock 假数据；已有「生成配图/生成」按钮请直接加 data-ai-action，不要另起新页。';

export async function runWebStudioIteration(params: {
  prompt: string;
  baseHtml: string;
  instruction: string;
  recoveryExtraRules?: string;
  aiCamp?: boolean;
  messages?: IterationChatMessage[];
  postProcess?: (html: string) => string;
  onStatusUpdate?: (status: string) => void;
}): Promise<string> {
  const {
    prompt,
    baseHtml,
    instruction,
    recoveryExtraRules = DEFAULT_RECOVERY_RULES,
    aiCamp,
    messages = [],
    postProcess,
    onStatusUpdate,
  } = params;

  const useAiCamp = aiCamp ?? wantsAiFeatures(instruction);

  async function callWeb(p: string, history = messages) {
    const r = await generateWebWithQueue(
      {
        prompt: p,
        interactive: true,
        ...(history.length ? { messages: history } : {}),
        ...(useAiCamp ? { aiCamp: true } : {}),
      },
      onStatusUpdate,
    );
    return mergeWebHtml({ html: r.html || '', css: r.css || '', js: r.js || '' });
  }

  function finalize(raw: string): string {
    let out = ensureIterationAiCapabilities(baseHtml, raw, instruction);
    if (postProcess) out = postProcess(out);
    return out;
  }

  let merged = finalize(await callWeb(prompt));

  if (isLikelyBrokenIteration(baseHtml, merged)) {
    merged = finalize(
      await callWeb(buildIterationRecoveryPrompt(baseHtml, merged, instruction, recoveryExtraRules)),
    );
    if (isLikelyBrokenIteration(baseHtml, merged)) {
      const salvaged = salvageIterationResult(baseHtml, merged, instruction);
      if (!salvaged) {
        throw new Error('修改后页面内容丢失过多，已中止保存。请换更具体的修改说明后重试，或先在版本树切回上一版。');
      }
      merged = finalize(salvaged);
    }
  }

  return merged;
}
