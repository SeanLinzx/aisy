/** 注入到生成页 / 发布页的全局 AI 调用 SDK 标记 */
export const AI_CAMP_RUNTIME_MARKER = 'data-ai-camp-runtime';
export const AI_CAMP_API_META = 'ai-camp-api-base';

/** 图片上传 API 说明（供 LLM 生成 HTML 时使用） */
export const AI_UPLOAD_PROMPT_HINT = `
【图片上传 — 使用 window.__AI_CAMP__】
- 弹出选图并上传：const url = await __AI_CAMP__.pickImageFile();
- 上传已有 File 对象：const url = await __AI_CAMP__.uploadImage(file);
- 展示图片：<img src={url} />（url 已是当前站点可访问路径）
- 典型模式：<input type="file" accept="image/*" id="photoInput" /> 选图后 preview.src = await __AI_CAMP__.uploadImage(file);
- 上传后可把 url 作为 AI 生图参考：await __AI_CAMP__.image('变成水彩画', null, url);`;

/** 小游戏本地暂存（浏览器 localStorage，本机有效） */
export const AI_LOCAL_STORAGE_HINT = `
【本地暂存 — 使用 window.__AI_CAMP__（打卡、分数、清单等）】
- 保存：__AI_CAMP__.saveLocal('scores', { level: 2, points: 100 });
- 读取：const data = __AI_CAMP__.loadLocal('scores', { level: 1, points: 0 });
- 删除：__AI_CAMP__.removeLocal('scores');
- 数据存在本机浏览器，刷新后仍在；换电脑或清缓存会丢失。`;

/** 供 LLM 生成/迭代 HTML 时使用的 API 说明 */
export const AI_API_PROMPT_HINT = `
【强制要求 — 必须调用真实 AI，禁止 mock / 写死假数据】
页面运行时已注入 window.__AI_CAMP__（与本项目 /student/text、/student/image 等页面相同的 API）。
用户点击「生成」类按钮时，必须 await __AI_CAMP__ 获取结果，不能把故事/图片写死在 JavaScript 字符串或 HTML 里。

API 用法：
- 生文：const text = await __AI_CAMP__.text(用户输入, '系统提示词');
- 生图：const url = await __AI_CAMP__.image('图片描述', (pos)=>更新排队提示);
- 生视频：const url = await __AI_CAMP__.video('视频描述', (pos)=>更新排队提示);
${AI_UPLOAD_PROMPT_HINT}
${AI_LOCAL_STORAGE_HINT}

交互要求：点击前校验输入 → 显示 loading → 成功展示结果，失败友好提示。
不要手写 fetch；不要删除 __AI_CAMP__ 调用。`;

/** 迭代修改时：用声明式标记新增 AI，平台自动注入真实调用，避免手写 JS 写坏页面 */
export const DECLARATIVE_AI_ITERATION_HINT = `
【新增/修改 AI 功能 — 声明式接入，禁止手写 __AI_CAMP__ 调用】
若修改意见涉及 AI 生文、生图、生视频，请：
1. 只调整 UI（按钮、输入框、结果展示区），保留原有布局与其它功能。
2. 在相关按钮上添加属性（不要手写 await __AI_CAMP__）：
   - data-ai-action="text" | "image" | "video"
   - data-ai-input="#输入框id"（可选）
   - data-ai-output="#结果区id"（可选，结果区可用 data-ai-output 标记）
   - data-ai-system="生文系统提示词"（可选，仅 text）
   - data-ai-prompt="无输入时的默认提示"（可选，生图/生视频）
3. 禁止在 HTML 里写 JavaScript 字符串拼接（如 src="'+imgUrl+'"）；img/video 的 src 留空即可。
4. 若页面已有「生成配图/生成记忆图/AI 生成」类按钮，请直接在该按钮上添加 data-ai-action，不要另起新页面或写 mock 假数据。`;

/** 浏览器端 IIFE：挂载 window.__AI_CAMP__ */
export function getAiCampRuntimeScript(apiBase?: string): string {
  const embeddedBase = apiBase ? `'${apiBase.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'` : '';
  return `(function(){
  if(window.__AI_CAMP__&&window.__AI_CAMP__.__v===4)return;
  function detectApiBase(){
    var meta=document.querySelector('meta[name="${AI_CAMP_API_META}"]');
    if(meta&&meta.content)return meta.content.replace(/\\/$/,'');
    var paths=[];
    try{paths.push(window.location.pathname||'');}catch(e){}
    try{if(window.parent&&window.parent!==window)paths.push(window.parent.location.pathname||'');}catch(e){}
    try{if(window.top&&window.top!==window)paths.push(window.top.location.pathname||'');}catch(e){}
    for(var i=0;i<paths.length;i++){
      var p=paths[i];
      if(p.indexOf('/aisy_pad')===0)return '/aisy_pad/api';
      if(p.indexOf('/aisy')===0)return '/aisy/api';
    }
    return '/api';
  }
  function sitePrefix(){
    var meta=document.querySelector('meta[name="${AI_CAMP_API_META}"]');
    if(meta&&meta.content){
      var api=meta.content.replace(/\\/$/,'');
      if(api.indexOf('/api')>=0)return api.replace(/\\/api$/,'');
    }
    var paths=[];
    try{paths.push(window.location.pathname||'');}catch(e){}
    try{if(window.parent&&window.parent!==window)paths.push(window.parent.location.pathname||'');}catch(e){}
    try{if(window.top&&window.top!==window)paths.push(window.top.location.pathname||'');}catch(e){}
    for(var i=0;i<paths.length;i++){
      var p=paths[i];
      if(p.indexOf('/aisy_pad')===0)return '/aisy_pad';
      if(p.indexOf('/aisy')===0)return '/aisy';
    }
    return '';
  }
  var API=${embeddedBase || 'detectApiBase()'};
  function unwrap(j){if(j&&typeof j==='object'&&j.success===true&&j.data!==undefined)return j.data;return j;}
  function parseRes(res){return res.text().then(function(t){
    if((t.indexOf('<html')>=0||t.indexOf('<!DOCTYPE')>=0)&&!res.ok){
      throw new Error('AI 接口不可用 ('+res.status+')，请确认已登录并重试');
    }
    var j;try{j=JSON.parse(t);}catch(e){throw new Error(res.ok?t||'请求失败':'AI 请求失败 ('+res.status+')');}
    if(!res.ok){var d=unwrap(j);throw new Error((d&&d.message)||(j&&j.message)||'请求失败 ('+res.status+')');}
    return unwrap(j);
  });}
  function req(path,opt){opt=opt||{};var headers=Object.assign({},opt.headers||{});if(!(opt.body instanceof FormData))headers=Object.assign({'Content-Type':'application/json'},headers);return fetch(API+path,{method:opt.method||'GET',credentials:'include',headers:headers,body:opt.body}).then(function(res){if(res.status===401)throw new Error('请先登录 AI Camp');return parseRes(res);});}
  function sleep(ms){return new Promise(function(r){setTimeout(r,ms);});}
  function pollJob(jobId,onQueue){var MAX=600000,start=Date.now();function tick(){if(Date.now()-start>MAX)return Promise.reject(new Error('排队等待超时，请稍后重试'));return req('/ai-generate/jobs/'+jobId).then(function(job){if(job.status==='succeeded')return job;if(job.status==='failed')return Promise.reject(new Error(job.error||'生成失败'));if(typeof job.queuePosition==='number'&&onQueue)onQueue(job.queuePosition);return sleep(2500).then(tick);});}return tick();}
  function resolveUploadUrl(url){
    if(!url)return url;
    var prefix=sitePrefix();
    var m=String(url).match(/\\/((?:aisy(?:_pad)?\\/)?uploads\\/[^\\s?#]+)/);
    if(m){
      var path=m[1];
      if(path.indexOf('/aisy')===0)return path;
      return prefix+path;
    }
    if(String(url).indexOf('/uploads/')===0)return prefix+url;
    return url;
  }
  function uploadImage(file){
    if(!file) return Promise.reject(new Error('请选择图片文件'));
    var fd=new FormData();
    fd.append('file',file);
    return req('/storage/upload',{method:'POST',body:fd}).then(function(d){return resolveUploadUrl(d.url);});
  }
  function pickImageFile(opts){
    opts=opts||{};
    return new Promise(function(resolve,reject){
      var input=document.createElement('input');
      input.type='file';
      input.accept=opts.accept||'image/*';
      input.style.display='none';
      document.body.appendChild(input);
      input.addEventListener('change',function(){
        var f=input.files&&input.files[0];
        document.body.removeChild(input);
        if(!f){reject(new Error('未选择图片'));return;}
        uploadImage(f).then(resolve).catch(reject);
      });
      input.click();
    });
  }
  var LS_PREFIX='aiCampApp:';
  function saveLocal(key,value){
    try{localStorage.setItem(LS_PREFIX+key,JSON.stringify(value));}catch(e){}
  }
  function loadLocal(key,fallback){
    try{var raw=localStorage.getItem(LS_PREFIX+key);return raw?JSON.parse(raw):fallback;}catch(e){return fallback;}
  }
  function removeLocal(key){
    try{localStorage.removeItem(LS_PREFIX+key);}catch(e){}
  }
  window.__AI_CAMP__={
    __v:4,
    apiBase:API,
    resolveUploadUrl:resolveUploadUrl,
    uploadImage:uploadImage,
    pickImageFile:pickImageFile,
    saveLocal:saveLocal,
    loadLocal:loadLocal,
    removeLocal:removeLocal,
    text:function(prompt,system){var body={prompt:prompt,saveAsAsset:false};if(system)body.system=system;return req('/ai-generate/text',{method:'POST',body:JSON.stringify(body)}).then(function(d){return d.text;});},
    textChat:function(messages,system){var last=messages&&messages.length?messages[messages.length-1]:null;var body={prompt:(last&&last.content)||'',messages:messages,saveAsAsset:false};if(system)body.system=system;return req('/ai-generate/text',{method:'POST',body:JSON.stringify(body)}).then(function(d){return d.text;});},
    image:function(prompt,onQueue,referenceUrl){
      var body={prompt:prompt};
      if(referenceUrl)body.references=[{type:'image',url:referenceUrl}];
      return req('/ai-generate/image',{method:'POST',body:JSON.stringify(body)}).then(function(data){
        if(data.queued){return pollJob(data.jobId,onQueue).then(function(job){var urls=(job.output&&job.output.imageUrls)||[];return urls[0]||'';});}
        return(data.imageUrls&&data.imageUrls[0])||'';
      });
    },
    video:function(prompt,onQueue){return req('/ai-generate/video',{method:'POST',body:JSON.stringify({prompt:prompt})}).then(function(data){if(data.queued||data.status==='queued'){return pollJob(data.jobId,onQueue).then(function(job){return(job.output&&job.output.videoUrl)||'';});}return data.videoUrl||'';});}
  };
})();`;
}

function stripOldRuntime(html: string): string {
  return html.replace(/<meta\b[^>]*name=["']ai-camp-api-base["'][^>]*>/gi, '').replace(
    /<script\b[^>]*data-ai-camp-runtime[^>]*>[\s\S]*?<\/script>/gi,
    '',
  );
}

function resolveWebApiBase(): string | undefined {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE) {
    return process.env.NEXT_PUBLIC_API_BASE.replace(/\/$/, '');
  }
  return undefined;
}

/** 向单文件 HTML 注入 AI Camp 运行时（幂等，会升级旧版 runtime） */
export function injectAiCampRuntime(html: string, apiBase?: string): string {
  if (!html?.trim()) return html;
  const base = (apiBase || resolveWebApiBase() || '').replace(/\/$/, '');
  let doc = stripOldRuntime(html);
  const meta = base ? `<meta name="${AI_CAMP_API_META}" content="${base}">` : '';
  const block = `${meta}<script ${AI_CAMP_RUNTIME_MARKER}="1">${getAiCampRuntimeScript(base || undefined)}<\/script>`;
  if (/<\/head>/i.test(doc)) return doc.replace(/<\/head>/i, `${block}</head>`);
  if (/<\/body>/i.test(doc)) return doc.replace(/<\/body>/i, `${block}</body>`);
  if (/<!DOCTYPE/i.test(doc) || /<\s*html[\s>]/i.test(doc)) {
    return doc.replace(/<html([^>]*)>/i, `<html$1><head><meta charset="utf-8" />${block}</head>`);
  }
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8" />${block}</head><body>${doc}</body></html>`;
}

/** 迭代修改时，若用户提到 AI 相关需求则附加 API 说明 */
export function wantsAiFeatures(instruction: string): boolean {
  return /AI|生图|生文|生视频|文本生成|图片生成|视频生成|工作流|大模型|调用.*AI|魔法|生成按钮|上传|图片上传|选择图片|选图|配图|记忆配图|假数据|真正调用|mock/i.test(
    instruction,
  );
}

/** 检测 HTML 是否包含真实 __AI_CAMP__ API 调用 */
export function hasAiCampUsage(html: string): boolean {
  return /__AI_CAMP__\s*\.\s*(text|textChat|image|video|uploadImage|pickImageFile|saveLocal|loadLocal)\s*\(/.test(html);
}

/** 检测是否为旧版 runtime（API 路径可能错误） */
export function needsRuntimeUpgrade(html: string): boolean {
  if (!html.includes(AI_CAMP_RUNTIME_MARKER)) return true;
  if (!html.includes('__v:4') && !html.includes('__v===4')) return true;
  return false;
}

export function refreshAiCampRuntime(html: string, apiBase?: string): string {
  return injectAiCampRuntime(html, apiBase);
}
