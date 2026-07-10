export function AiWarning({ extra }: { extra?: string }) {
  return (
    <div className="ai-warning">
      <span className="text-base">⚠️</span>
      <span>AI 内容可能有误，请老师或家长协助核对。{extra}</span>
    </div>
  );
}
