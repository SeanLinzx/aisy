import { mergeWebHtml } from '@/lib/merge-web-html';

/** 合并预览用的 html/css/js 为可导出的完整单文件 HTML */
export function buildExportableWebHtml(html: string, css?: string, js?: string): string {
  return mergeWebHtml({ html: html || '', css: css || '', js: js || '' });
}

/** 下载当前页面 HTML，便于拿到站外用其他 AI 工具继续修改 */
export function downloadWebHtml(fullHtml: string, filename = 'page.html') {
  const safeName = filename.replace(/[^\w\u4e00-\u9fa5.-]+/g, '_').replace(/\.html?$/i, '') || 'page';
  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeName}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
