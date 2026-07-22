import { api } from '@/lib/api';
import type { ChatMessage } from '@/lib/pm-pipeline';
import {
  applyPmOutputLengthLimit,
  clampPmReply,
  wrapPmUserPromptWithLengthLimit,
} from '@/lib/pm-chat-limits';

export async function sendPmChat(params: {
  prompt: string;
  system?: string;
  messages?: ChatMessage[];
  /** 设置后会在 system/任务中追加长度约束，并对回复做截断（如提示词测试页 500 字） */
  maxReplyChars?: number;
}): Promise<string> {
  const limit = params.maxReplyChars;
  const system =
    limit != null ? applyPmOutputLengthLimit(params.system) : params.system?.trim() || undefined;
  const prompt =
    limit != null ? wrapPmUserPromptWithLengthLimit(params.prompt, params.system) : params.prompt;

  const r = await api.post('/ai-generate/text', {
    prompt,
    system,
    messages: params.messages,
    saveAsAsset: false,
  });
  const text = r.data.text as string;
  return limit != null ? clampPmReply(text, limit) : text;
}
