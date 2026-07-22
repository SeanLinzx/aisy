/** PM 课程对话/测试：单次 AI 回复字数上限 */
export const PM_SINGLE_REPLY_MAX_CHARS = 500;

export const PM_OUTPUT_LENGTH_RULE =
  '【输出长度】每次回复正文不超过 500 个汉字（含标点）。条目精简、句子短；不要为了凑字写长段落。';

export function applyPmOutputLengthLimit(system?: string): string | undefined {
  const rule = PM_OUTPUT_LENGTH_RULE;
  if (!system?.trim()) return rule;
  if (/500\s*字|不超过\s*500/.test(system)) return system.trim();
  return `${system.trim()}\n\n${rule}`;
}

/** 对照组无 system 时，在用户任务后追加长度提示 */
export function wrapPmUserPromptWithLengthLimit(prompt: string, system?: string): string {
  if (system?.trim()) return prompt;
  if (/500\s*字/.test(prompt)) return prompt;
  return `${prompt}\n\n（请把回答控制在 500 字以内。）`;
}

export function clampPmReply(text: string, max = PM_SINGLE_REPLY_MAX_CHARS): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…（内容较长，已截断显示）`;
}
