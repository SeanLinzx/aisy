export type IterationChatMessage = { role: 'user' | 'assistant'; content: string };

/** 保留最近 N 轮对话，避免 token 膨胀 */
export function trimIterationHistory(history: IterationChatMessage[], max = 6): IterationChatMessage[] {
  return history.slice(-max);
}

/** 迭代成功后写入 assistant 摘要（不含完整 HTML） */
export function summarizeIterationTurn(instruction: string): string {
  const trimmed = instruction.trim();
  if (!trimmed) return '已完成页面修改。';
  return trimmed.length > 160 ? `已完成修改：${trimmed.slice(0, 160)}…` : `已完成修改：${trimmed}`;
}

export function appendIterationTurn(
  history: IterationChatMessage[],
  instruction: string,
): IterationChatMessage[] {
  return trimIterationHistory([
    ...history,
    { role: 'user', content: instruction.trim() },
    { role: 'assistant', content: summarizeIterationTurn(instruction) },
  ]);
}
