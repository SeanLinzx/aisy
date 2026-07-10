/** 与后端 prompt-sanitize 保持一致的轻量版，供前端提交前预处理 */
const COPYRIGHT_TERM_REPLACEMENTS: Array<[RegExp, string]> = [
  [/奶龙/g, '圆润的奶黄色小恐龙'],
  [/Nai\s*Long/gi, 'round cream-yellow cartoon dinosaur'],
];

export function sanitizeCopyrightTerms(text: string): string {
  let out = text;
  for (const [pattern, replacement] of COPYRIGHT_TERM_REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

export function humanizeArkVideoError(message?: string | null): string | undefined {
  if (!message) return undefined;
  const lower = message.toLowerCase();
  if (lower.includes('copyright')) {
    return '生成被拒绝：描述或参考图可能涉及受版权保护的角色/作品。请改用通用描述（例如「奶黄色小恐龙变成公主」，不要写具体角色名），再试一次。';
  }
  return message;
}
