'use client';
import { useEffect, useMemo } from 'react';
import { refreshAiCampRuntime, ensureDeclarativeAiBridge } from '@ai-camp/types';

/** 用户在预览 iframe 里点选到的页面元素 */
export interface PickedElement {
  tag: string;
  text: string;
  hint: string;
  outerHtml: string;
}

const PICKER_SCRIPT = `
(function(){
  var selected=null;
  var HOVER='outline:2px dashed #a78bfa!important;outline-offset:2px!important;cursor:pointer!important';
  var ACTIVE='outline:3px solid #7c3aed!important;outline-offset:2px!important;box-shadow:0 0 0 4px rgba(124,58,237,.15)!important';
  function resolvePickTarget(t){
    if(!t||t===document.body||t===document.documentElement) return null;
    var card=t.closest('.ai-camp-pf-card[data-pf-card]');
    if(card) return card;
    if(t.id==='portfolio-works-root') return null;
    if(t.closest&&t.closest('.ai-camp-pf-nav,.ai-camp-pf-meta')) return null;
    if(t.classList){
      if(t.classList.contains('ai-camp-pf-section')||t.classList.contains('ai-camp-pf-grid')||t.classList.contains('ai-camp-pf-works')) return null;
    }
    if(t.closest&&t.closest('#portfolio-works-root')&&!t.closest('.ai-camp-pf-card[data-pf-card]')) return null;
    return t;
  }
  function describe(el){
    var tag=el.tagName.toLowerCase();
    var text=(el.innerText||'').trim().replace(/\\s+/g,' ').slice(0,120);
    var hint=tag;
    if(el.matches&&el.matches('.ai-camp-pf-card[data-pf-card]')){
      var title=el.querySelector('h3');
      hint='作品卡片「'+(title?(title.innerText||'').trim().slice(0,28):'未命名')+'」';
    }else if(text) hint+='「'+text.slice(0,36)+(text.length>36?'…':'')+'」';
    return {tag:tag,text:text,hint:hint,outerHtml:el.outerHTML.slice(0,1200)};
  }
  function clearSel(){
    if(!selected) return;
    selected.style.cssText=selected.dataset.__prevStyle||'';
    selected=null;
  }
  document.addEventListener('mouseover',function(e){
    var t=resolvePickTarget(e.target);
    if(!t||t===selected) return;
    if(t.dataset.__prevStyle===undefined) t.dataset.__prevStyle=t.getAttribute('style')||'';
    t.style.cssText=(t.dataset.__prevStyle||'')+';'+HOVER;
  },true);
  document.addEventListener('mouseout',function(e){
    var t=e.target;
    if(!t||t===selected) return;
    var pick=resolvePickTarget(t);
    if(!pick||pick!==t) return;
    t.style.cssText=t.dataset.__prevStyle||'';
  },true);
  document.addEventListener('click',function(e){
    e.preventDefault();
    e.stopPropagation();
    var t=resolvePickTarget(e.target);
    if(!t) return;
    clearSel();
    selected=t;
    t.dataset.__prevStyle=t.getAttribute('style')||'';
    t.style.cssText=(t.dataset.__prevStyle||'')+';'+ACTIVE;
    try{parent.postMessage({type:'html-preview-pick',payload:describe(t)},'*');}catch(err){}
  },true);
  window.addEventListener('message',function(e){
    if(e.data&&e.data.type==='html-preview-clear-pick') clearSel();
  });
})();
`;

/** 把小朋友在预览里点选的若干个块，整理成一段可以塞进 AI 提示词的说明文字 */
export function describePickedElements(blocks: PickedElement[]): string {
  if (!blocks.length) return '';
  return blocks
    .map((b, i) => `${i + 1}. ${b.hint}\n   对应的 HTML 片段：${b.outerHtml}`)
    .join('\n');
}

export function buildPreviewDoc(html: string, css?: string, js?: string, pickMode = false): string {
  const safeHtml = html || '<p style="font-family:system-ui;color:#9ca3af;text-align:center;margin-top:40%">这里会显示页面预览</p>';
  if (/<\/html>/i.test(safeHtml)) {
    let doc = safeHtml;
    if (css) doc = doc.replace(/<\/head>/i, `<style>${css}</style></head>`);
    const bodyScripts = [js, pickMode ? PICKER_SCRIPT : ''].filter(Boolean).join('\n');
    if (bodyScripts) doc = doc.replace(/<\/body>/i, `<script>${bodyScripts}</script></body>`);
    return ensureDeclarativeAiBridge(refreshAiCampRuntime(doc));
  }
  const bodyScripts = [js, pickMode ? PICKER_SCRIPT : ''].filter(Boolean).join('\n');
  return ensureDeclarativeAiBridge(
    refreshAiCampRuntime(`<!doctype html><html><head><meta charset="utf-8"><style>${css || ''}</style></head><body>${safeHtml}<script>${bodyScripts}<\/script></body></html>`),
    { js },
  );
}

/**
 * 受限沙箱预览。interactive=false 时不允许脚本，适合展示无交互静态页。
 */
export function HtmlPreview({
  html,
  css,
  js,
  height = 460,
  className = '',
  interactive = true,
  pickMode = false,
  onPick,
}: {
  html: string;
  css?: string;
  js?: string;
  height?: number;
  className?: string;
  /** 为 false 时禁止 iframe 内脚本运行（静态预览） */
  interactive?: boolean;
  /** 开启后可在预览里点击元素，选中结果通过 onPick 回传 */
  pickMode?: boolean;
  onPick?: (element: PickedElement) => void;
}) {
  const doc = useMemo(() => buildPreviewDoc(html, css, js, pickMode), [html, css, js, pickMode]);

  useEffect(() => {
    if (!pickMode || !onPick) return;
    const pick = onPick;
    function onMsg(e: MessageEvent) {
      if (e?.data?.type !== 'html-preview-pick') return;
      const payload = e.data.payload as PickedElement | undefined;
      if (payload?.tag) pick(payload);
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [pickMode, onPick]);

  const sandbox =
    interactive || pickMode
      ? pickMode
        ? 'allow-scripts allow-same-origin'
        : 'allow-scripts allow-same-origin allow-popups allow-modals'
      : '';

  return (
    <iframe
      sandbox={sandbox}
      srcDoc={doc}
      className={`w-full rounded-2xl border-2 bg-white ${pickMode ? 'border-violet-300 ring-2 ring-violet-100' : 'border-orange-100'} ${className}`}
      style={{ height }}
      title={pickMode ? '点选迭代预览' : interactive ? '交互预览' : '静态预览'}
    />
  );
}
