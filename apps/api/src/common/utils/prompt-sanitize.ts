/** 常见受版权保护的角色/品牌 → 通用描述，降低 Ark 视频/图片版权拦截概率 */
const COPYRIGHT_TERM_REPLACEMENTS: Array<[RegExp, string]> = [
  [/奶龙/g, '圆润的奶黄色小恐龙'],
  [/Nai\s*Long/gi, 'round cream-yellow cartoon dinosaur'],
  [/奥特曼/g, '银色科幻英雄'],
  [/迪士尼/g, '童话风格'],
  [/米老鼠/g, '黑色圆耳卡通老鼠'],
  [/皮卡丘/g, '黄色电气系卡通精灵'],
  [/蜘蛛侠/g, '红蓝配色超级英雄'],
  [/钢铁侠/g, '红金配色机甲英雄'],
  [/艾莎/g, '冰雪主题公主'],
  [/小猪佩奇/g, '粉色卡通小猪'],
];

export function sanitizeCopyrightTerms(text: string): string {
  let out = text;
  for (const [pattern, replacement] of COPYRIGHT_TERM_REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

function isTimeoutLikeMessage(lower: string, code?: string): boolean {
  if (code && ['UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT', 'ETIMEDOUT', 'ECONNRESET', 'UND_ERR_SOCKET'].includes(code)) {
    return true;
  }
  return (
    lower.includes('headers timeout') ||
    lower.includes('header timeout') ||
    lower.includes('body timeout') ||
    lower.includes('connect timeout') ||
    lower.includes('econnreset') ||
    lower.includes('etimedout')
  );
}

/** 将 Ark 英文错误转为儿童友好的中文说明 */
export function humanizeArkVideoError(message?: string | null): string | undefined {
  if (!message) return undefined;
  const lower = message.toLowerCase();
  if (lower.includes('copyright')) {
    return '生成被拒绝：描述或参考图可能涉及受版权保护的角色/作品。请改用通用描述（例如「奶黄色小恐龙变成公主」，不要写具体角色名），再试一次。';
  }
  if (lower.includes('duration') && (lower.includes('not valid') || lower.includes('invalid'))) {
    return '视频时长设置不正确（Seedance 模型仅支持 4–15 秒）。请选 5、8 或 11 秒后重试。';
  }
  if (lower.includes('risk') || lower.includes('sensitive') || lower.includes('moderation')) {
    return '生成被拒绝：内容可能不符合平台安全规范，请修改描述后重试。';
  }
  if (isTimeoutLikeMessage(lower)) {
    return '视频服务响应超时，任务可能仍在后台处理。请稍等片刻查看下方进度，或稍后重试。';
  }
  return message;
}

/**
 * 将 AI 文本/网页生成的底层网络错误（undici HeadersTimeoutError 等）转为儿童友好的中文说明。
 * 网页/工作流类生成常带整页历史代码作为上下文，模型生成耗时较长，容易撞到网络层超时。
 */
export function humanizeArkGenerationError(err: unknown): Error {
  const e = err as { message?: string; code?: string } | undefined;
  const message = e?.message || String(err);
  const lower = message.toLowerCase();
  if (isTimeoutLikeMessage(lower, e?.code)) {
    return new Error(
      '生成超时：这次修改的内容较多，AI 还没来得及在规定时间内生成完。请稍等几秒后重新点击「应用修改」，或先精简一下修改说明再试。',
    );
  }
  return err instanceof Error ? err : new Error(message);
}
