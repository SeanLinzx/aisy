/** API 端发布页注入 runtime（与 packages/types/ai-camp-runtime.ts 保持同步） */
export const AI_CAMP_RUNTIME_MARKER = 'data-ai-camp-runtime';
export const AI_CAMP_API_META = 'ai-camp-api-base';

function webBasePath(): string {
  return (process.env.WEB_BASE_PATH || '').replace(/\/$/, '');
}

function publishApiBase(): string {
  const base = webBasePath();
  return `${base}/api`.replace(/\/+/g, '/');
}

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

export function injectAiCampRuntime(html: string, apiBase?: string): string {
  if (!html?.trim()) return html;
  const base = (apiBase || publishApiBase()).replace(/\/$/, '');
  let doc = stripOldRuntime(html);
  const meta = `<meta name="${AI_CAMP_API_META}" content="${base}">`;
  const block = `${meta}<script ${AI_CAMP_RUNTIME_MARKER}="1">${getAiCampRuntimeScript(base)}<\/script>`;
  if (/<\/head>/i.test(doc)) return doc.replace(/<\/head>/i, `${block}</head>`);
  if (/<\/body>/i.test(doc)) return doc.replace(/<\/body>/i, `${block}</body>`);
  if (/<!DOCTYPE/i.test(doc) || /<\s*html[\s>]/i.test(doc)) {
    return doc.replace(/<html([^>]*)>/i, `<html$1><head><meta charset="utf-8" />${block}</head>`);
  }
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8" />${block}</head><body>${doc}</body></html>`;
}
