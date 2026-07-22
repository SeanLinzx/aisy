/** 判断字符串是否像 HTML / 网页源码，不宜作为标题或提示词展示 */
export function isHtmlLike(raw: string): boolean {
  const s = raw.trim();
  if (!s) return false;
  if (/^\s*<!DOCTYPE/i.test(s)) return true;
  if (/^\s*<\?xml/i.test(s)) return true;
  if (/^\s*<html[\s>/]/i.test(s)) return true;
  if (/<\/?(html|head|body|script|style|meta|link|iframe)[\s>/]/i.test(s) && /<[a-z][\s\S]*>/i.test(s)) {
    return true;
  }
  return false;
}

/** 去掉 HTML 标签与多余空白，得到纯文本 */
export function stripHtmlToPlainText(raw: string): string {
  if (!raw) return '';
  let s = raw
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
  return s;
}

/** 列表/标题用：剥离 HTML 并截断 */
export function plainTextPreview(raw: string | null | undefined, maxLen = 80): string {
  if (!raw) return '';
  const plain = isHtmlLike(raw) ? stripHtmlToPlainText(raw) : raw.replace(/\s+/g, ' ').trim();
  if (!plain) return '';
  if (plain.length <= maxLen) return plain;
  return `${plain.slice(0, maxLen)}…`;
}

export function assetDisplayTitle(title: string | null | undefined, fallback = '未命名素材'): string {
  const plain = plainTextPreview(title, 120);
  return plain || fallback;
}
