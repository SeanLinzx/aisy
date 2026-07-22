export const DECL_BRIDGE_MARKER = 'data-pm-ai-decl-bridge';

export function getDeclarativeAiBridgeScript(defaultAction: 'text' | 'image' | 'video' = 'text'): string {
  return `(function(){
  if(window.__PM_AI_DECL_BRIDGE__)return;
  window.__PM_AI_DECL_BRIDGE__=true;
  var DEFAULT_ACTION='${defaultAction}';
  function pickInput(sel){
    if(sel){var el=document.querySelector(sel);if(el)return el;}
    return document.querySelector('input:not([type=hidden]):not([type=file]):not([type=checkbox]):not([type=radio]),textarea');
  }
  function pickOutput(sel){
    if(sel){var el=document.querySelector(sel);if(el)return el;}
    return document.querySelector('[data-ai-output],#aiOutput,#output,#result,.result,#storyResult,[id*="story"],[id*="result"],[id*="image"],[class*="result"]');
  }
  function setLoading(on){
    var l=document.getElementById('aiLoading')||document.querySelector('.loading,[class*="loading"]');
    if(l)l.style.display=on?'block':'none';
  }
  function inferAction(btn,t){
    var a=(btn.getAttribute('data-ai-action')||'').trim();
    if(a==='text'||a==='image'||a==='video')return a;
    if(/生图|配图|解释图|画一张|图片生成|AI图|插图|生成图/i.test(t))return 'image';
    if(/生视频|视频生成|拍一段/i.test(t))return 'video';
    return DEFAULT_ACTION;
  }
  function renderOutput(target,action,data){
    if(!target||target.tagName==='BODY'||target.tagName==='HTML')return;
    if(action==='image'){
      if(target.tagName==='IMG'){target.src=data;target.style.display='block';target.removeAttribute('data-ai-broken-fixed');}
      else target.innerHTML='<img src="'+data+'" style="max-width:100%;border-radius:12px" alt="AI生成"/>';
    }else if(action==='video'){
      target.innerHTML='<video src="'+data+'" controls playsinline style="max-width:100%;border-radius:12px"></video>';
    }else{
      if(target.tagName==='INPUT'||target.tagName==='TEXTAREA')target.value=data;
      else target.textContent=data;
    }
  }
  async function run(btn){
    var t=(btn.textContent||'').trim();
    var action=inferAction(btn,t);
    var input=pickInput(btn.getAttribute('data-ai-input'));
    var output=pickOutput(btn.getAttribute('data-ai-output'));
    var val=input?String(input.value||'').trim():'';
    var prompt=val||btn.getAttribute('data-ai-prompt')||'';
    if(action==='text'&&!val&&!prompt){alert('请先输入内容');return;}
    if((action==='image'||action==='video')&&!prompt){prompt=val||'请生成一张适合小朋友看的解释图';}
    setLoading(true);
    if(output)renderOutput(output,action,action==='text'?'AI 正在思考…':'');
    try{
      var result;
      if(action==='image')result=await __AI_CAMP__.image(prompt);
      else if(action==='video')result=await __AI_CAMP__.video(prompt);
      else result=await __AI_CAMP__.text(prompt||val,btn.getAttribute('data-ai-system')||undefined);
      renderOutput(output,action,result);
    }catch(e){
      var msg=(e&&e.message)||'AI 调用失败';
      if(output)renderOutput(output,'text','生成失败：'+msg);
      else alert(msg);
    }finally{setLoading(false);}
  }
  function bind(){
    document.querySelectorAll('[data-ai-action]').forEach(function(btn){
      if(btn.dataset.pmDeclBound)return;
      btn.dataset.pmDeclBound='1';
      btn.addEventListener('click',function(ev){ev.preventDefault();ev.stopImmediatePropagation();run(btn);},true);
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})();`;
}

/** 页面 HTML（含可选 js 字段内容）是否已有声明式 AI 按钮 */
export function hasDeclarativeAiActions(html: string, js?: string): boolean {
  const doc = `${html || ''}\n${js || ''}`;
  return /\bdata-ai-action\s*=\s*["'](text|image|video)["']/i.test(doc);
}

/** 是否已注入声明式桥接脚本 */
export function hasDeclarativeAiBridge(html: string, js?: string): boolean {
  const doc = `${html || ''}\n${js || ''}`;
  return new RegExp(DECL_BRIDGE_MARKER, 'i').test(doc) || /__PM_AI_DECL_BRIDGE__/.test(doc);
}

export function injectDeclarativeAiBridge(
  html: string,
  defaultAction: 'text' | 'image' | 'video' = 'text',
): string {
  let doc = html.replace(
    new RegExp(`<script\\b[^>]*${DECL_BRIDGE_MARKER}[^>]*>[\\s\\S]*?<\\/script>`, 'gi'),
    '',
  );
  const block = `<script ${DECL_BRIDGE_MARKER}="1">${getDeclarativeAiBridgeScript(defaultAction)}<\/script>`;
  if (/<\/body>/i.test(doc)) return doc.replace(/<\/body>/i, `${block}</body>`);
  return `${doc}${block}`;
}

/** 若页面有 data-ai-action 但缺少桥接脚本，则自动补全 */
export function ensureDeclarativeAiBridge(
  html: string,
  opts?: { js?: string; defaultAction?: 'text' | 'image' | 'video' },
): string {
  if (!hasDeclarativeAiActions(html, opts?.js)) return html;
  if (hasDeclarativeAiBridge(html, opts?.js)) return html;
  return injectDeclarativeAiBridge(html, opts?.defaultAction ?? 'text');
}
