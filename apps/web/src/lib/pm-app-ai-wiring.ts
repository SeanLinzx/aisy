import type { AiFlowGraph, AiFlowNode, PmSingleAiConfig } from '@/lib/pm-pipeline';
import { resolveSingleAiSystemPrompt } from '@/lib/pm-pipeline';
import { injectAiCampRuntime, refreshAiCampRuntime, wantsAiFeatures } from '@ai-camp/types';
import {
  ensureDeclarativeAiBridge,
  hasDeclarativeAiActions,
  hasDeclarativeAiBridge,
  injectDeclarativeAiBridge as injectDeclBridge,
} from '@ai-camp/types';
import { api } from '@/lib/api';
import { generateWebWithQueue } from '@/lib/ai-generate-queue';
import { mergeWebHtml } from '@/lib/merge-web-html';
import {
  buildIterationRecoveryPrompt,
  ensureIterationAiCapabilities,
  isLikelyBrokenIteration,
  salvageIterationResult,
  inferAiActionFromInstruction,
} from '@/lib/web-iteration-base';
import { finalizeKidWebHtml } from '@/lib/web-upload-block';

export { hasAiCampUsage } from '@ai-camp/types';

const BRIDGE_MARKER = 'data-pm-ai-bridge';

/** 修复 AI 误把 JS 拼接写进 HTML 属性导致的 404（如 src="'+imgUrl+'"） */
export function sanitizeBrokenAiHtml(html: string): string {
  if (!html) return html;
  return html
    .replace(/\s(src|href)=(["'])[^"']*'\s*\+\s*\w+\s*\+\s*'[^"']*\2/gi, ' $1="" data-ai-broken-fixed="1"')
    .replace(/\s(src|href)=(["'])[^"']*\+\w+\+[^"']*\2/gi, ' $1="" data-ai-broken-fixed="1"');
}

/**
 * 修复「脚本泄漏成可见乱码」：`<script>` 标签丢失后，桥接 JS 会当正文显示。
 * 先保护合法 script，再清掉正文里的桥接/runtime IIFE。
 */
export function repairLeakedScriptText(html: string): string {
  if (!html) return html;
  if (
    !/__PM_AI_DECL_BRIDGE__|__AI_CAMP__|data-ai-camp-runtime|data-pm-ai-decl-bridge|pickInput\s*\(|renderOutput\s*\(/i.test(
      html,
    )
  ) {
    return html;
  }

  const scripts: string[] = [];
  let body = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (m) => {
    const key = `\u0000SCRIPT${scripts.length}\u0000`;
    scripts.push(m);
    return key;
  });

  // 泄漏的声明式 AI 桥接
  body = body.replace(
    /\(function\s*\(\s*\)\s*\{\s*if\s*\(\s*window\.__PM_AI_DECL_BRIDGE__[\s\S]*?\}\s*\)\s*\(\s*\)\s*;?/g,
    '',
  );
  // 泄漏的 AI Camp runtime
  body = body.replace(
    /\(function\s*\(\s*\)\s*\{\s*[\s\S]{0,80}?window\.__AI_CAMP__[\s\S]*?\}\s*\)\s*\(\s*\)\s*;?/g,
    '',
  );
  // 兜底：正文里残留的 pickInput 桥接片段（无 script 包裹）
  body = body.replace(
    /(?:^|>)\s*function\s+pickInput\s*\(\s*sel\s*\)\s*\{[\s\S]*?if\s*\(\s*document\.readyState[\s\S]*?bind\s*\(\s*\)\s*;?\s*(?=<|$)/g,
    (m) => (m.startsWith('>') ? '>' : ''),
  );
  // 兜底：泄漏的 renderOutput / inferAction 等桥接函数块
  body = body.replace(
    /(?:^|>)\s*function\s+(?:pickOutput|setLoading|inferAction|renderOutput|run)\s*\([^)]*\)\s*\{[\s\S]*?(?=(?:^|>)\s*function\s+\w+\s*\(|<\/(?:div|section|main|p|article|body|html)>|$)/g,
    (m) => (m.startsWith('>') ? '>' : ''),
  );

  body = body.replace(/\u0000SCRIPT(\d+)\u0000/g, (_, n) => scripts[Number(n)] || '');
  return body;
}

function injectDeclarativeAiBridge(html: string, defaultAction: 'text' | 'image' | 'video' = 'text'): string {
  return injectDeclBridge(html, defaultAction);
}

export function postProcessWebAppHtml(
  html: string,
  opts?: {
    enableImageUpload?: boolean;
    instruction?: string;
    defaultAiAction?: 'text' | 'image' | 'video';
    injectBridge?: boolean;
  },
): string {
  let out = sanitizeBrokenAiHtml(html);
  out = repairLeakedScriptText(out);
  out = refreshAiCampRuntime(out);
  const userHasAiCalls = hasAnyRealAiUsage(out);
  const wantsMoreAi = opts?.instruction ? wantsAiFeatures(opts.instruction) : false;
  const missingBridge = hasDeclarativeAiActions(out) && !hasDeclarativeAiBridge(out);
  const shouldBridge =
    opts?.injectBridge !== false && (!userHasAiCalls || wantsMoreAi || missingBridge);
  if (shouldBridge) {
    const defaultAction =
      opts?.defaultAiAction ||
      (opts?.instruction ? inferAiActionFromInstruction(opts.instruction) : 'text');
    out = injectDeclarativeAiBridge(out, defaultAction);
  }
  return finalizeKidWebHtml(out, { enableImageUpload: opts?.enableImageUpload });
}

export { ensureDeclarativeAiBridge };

function escapeForJsString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '');
}

/** 供 LLM 参考的完整生文调用示例（与课程 story-fill / pm-chat 一致的模式） */
export function buildTextAiCodeExample(opts: { systemPrompt?: string; inputHint?: string; outputHint?: string }) {
  const system = opts.systemPrompt?.trim() || '你是友好的儿童 AI 助手，用简单中文回答。';
  const inputHint = opts.inputHint?.trim() || '用户输入';
  const outputHint = opts.outputHint?.trim() || 'AI 生成结果';
  return `
// 【必须实现】点击按钮后调用真实 AI（禁止写死 mock 故事/假数据）
var generateBtn = document.getElementById('generateBtn'); // 或 querySelector 你的生成按钮
var inputEl = document.getElementById('userInput');       // 或 querySelector 输入框
var outputEl = document.getElementById('aiOutput');       // 展示 ${outputHint}
var loadingEl = document.getElementById('aiLoading');     // loading 元素

generateBtn.addEventListener('click', async function () {
  var userInput = (inputEl.value || '').trim();
  if (!userInput) { alert('请先输入${inputHint}'); return; }
  if (loadingEl) loadingEl.style.display = 'block';
  if (outputEl) outputEl.textContent = 'AI 正在思考…';
  try {
    var story = await __AI_CAMP__.text(userInput, '${escapeForJsString(system)}');
    if (outputEl) outputEl.textContent = story;
  } catch (err) {
    if (outputEl) outputEl.textContent = '生成失败：' + (err.message || '请稍后重试');
  } finally {
    if (loadingEl) loadingEl.style.display = 'none';
  }
});`;
}

export function buildImageAiCodeExample(opts: { inputHint?: string }) {
  const inputHint = opts.inputHint?.trim() || '图片描述';
  return `
generateBtn.addEventListener('click', async function () {
  var prompt = (inputEl.value || '').trim();
  if (!prompt) { alert('请先输入${inputHint}'); return; }
  if (loadingEl) loadingEl.style.display = 'block';
  try {
    var url = await __AI_CAMP__.image(prompt, function (pos) {
      if (statusEl) statusEl.textContent = '排队中，前面还有 ' + pos + ' 人';
    });
    resultImg.src = url;
    resultImg.style.display = 'block';
  } catch (err) {
    alert(err.message || '生图失败');
  } finally {
    if (loadingEl) loadingEl.style.display = 'none';
  }
});`;
}

export function buildImageUploadCodeExample(): string {
  return `
// 【图片上传示例】
var photoInput = document.getElementById('photoInput');
var previewImg = document.getElementById('previewImg');
photoInput.addEventListener('change', async function () {
  var file = photoInput.files && photoInput.files[0];
  if (!file) return;
  try {
    previewImg.alt = '上传中…';
    var url = await __AI_CAMP__.uploadImage(file);
    previewImg.src = url;
    previewImg.alt = '已上传';
  } catch (err) {
    alert(err.message || '上传失败');
  }
});
// 或一键选图上传：previewImg.src = await __AI_CAMP__.pickImageFile();`;
}

export function buildVideoAiCodeExample(opts: { inputHint?: string }) {
  const inputHint = opts.inputHint?.trim() || '视频描述';
  return `
generateBtn.addEventListener('click', async function () {
  var prompt = (inputEl.value || '').trim();
  if (!prompt) { alert('请先输入${inputHint}'); return; }
  if (loadingEl) loadingEl.style.display = 'block';
  try {
    var url = await __AI_CAMP__.video(prompt, function (pos) {
      if (statusEl) statusEl.textContent = '排队中，前面还有 ' + pos + ' 人';
    });
    resultVideo.src = url;
    resultVideo.style.display = 'block';
  } catch (err) {
    alert(err.message || '生视频失败');
  } finally {
    if (loadingEl) loadingEl.style.display = 'none';
  }
});`;
}

export function buildPmSingleAiCodeExample(singleAi: PmSingleAiConfig): string {
  const base = {
    systemPrompt: resolveSingleAiSystemPrompt(singleAi),
    inputHint: singleAi.inputDesc,
    outputHint: singleAi.outputDesc,
  };
  if (singleAi.type === 'image') return buildImageAiCodeExample(base);
  if (singleAi.type === 'video') return buildVideoAiCodeExample(base);
  return buildTextAiCodeExample(base);
}

function topoOrder(flow: AiFlowGraph): AiFlowNode[] {
  const nodes = flow.nodes;
  if (!nodes.length) return [];
  const inDeg = new Map(nodes.map((n) => [n.id, 0]));
  for (const e of flow.edges) inDeg.set(e.target, (inDeg.get(e.target) || 0) + 1);
  const q = nodes.filter((n) => (inDeg.get(n.id) || 0) === 0);
  const out: AiFlowNode[] = [];
  const edges = [...flow.edges];
  while (q.length) {
    const n = q.shift()!;
    out.push(n);
    for (const e of edges.filter((x) => x.source === n.id)) {
      const d = (inDeg.get(e.target) || 1) - 1;
      inDeg.set(e.target, d);
      if (d === 0) {
        const target = nodes.find((x) => x.id === e.target);
        if (target) q.push(target);
      }
    }
  }
  return out.length ? out : nodes;
}

export function buildPmWorkflowAiCodeExample(flow: AiFlowGraph): string {
  const order = topoOrder(flow);
  const lines = order.map((n, i) => {
    const sys = n.systemPrompt?.trim() ? `, '${escapeForJsString(n.systemPrompt.trim())}'` : '';
    if (n.type === 'image') {
      return `  ctx = await __AI_CAMP__.image(ctx); // 步骤${i + 1} ${n.label}`;
    }
    if (n.type === 'video') {
      return `  ctx = await __AI_CAMP__.video(ctx); // 步骤${i + 1} ${n.label}`;
    }
    return `  ctx = await __AI_CAMP__.text(ctx${sys}); // 步骤${i + 1} ${n.label}`;
  });
  return `
runBtn.addEventListener('click', async function () {
  var userInput = (inputEl.value || '').trim();
  if (!userInput) { alert('请先输入'); return; }
  var ctx = userInput;
  try {
${lines.join('\n')}
    outputEl.textContent = ctx;
  } catch (err) {
    alert(err.message || '工作流执行失败');
  }
});`;
}

function injectBridgeScript(html: string, scriptBody: string): string {
  let doc = html.replace(/<script\b[^>]*data-pm-ai-bridge[^>]*>[\s\S]*?<\/script>/gi, '');
  const block = `<script ${BRIDGE_MARKER}="1">${scriptBody}<\/script>`;
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${block}</body>`);
  return `${html}${block}`;
}

function buildSingleBridgeScript(singleAi: PmSingleAiConfig): string {
  const system = escapeForJsString(resolveSingleAiSystemPrompt(singleAi));
  const type = singleAi.type;
  return `(function(){
  if(window.__PM_AI_BRIDGE__)return;
  window.__PM_AI_BRIDGE__=true;
  var AI_TYPE='${type}';
  var SYSTEM='${system}';
  async function runPmAi(){
    var input=document.querySelector('input:not([type=hidden]):not([type=checkbox]):not([type=radio]),textarea');
    var loading=document.getElementById('aiLoading')||document.querySelector('.loading,[class*="loading"]');
    var output=document.querySelector('[data-ai-output],#aiOutput,#output,#result,.result,[id*="story"],[class*="story"],main');
    var val=input?String(input.value||'').trim():'';
    if(!val){alert('请先输入内容');return;}
    if(loading)loading.style.display='block';
    if(output&&output.tagName!=='BODY'&&output.tagName!=='MAIN')output.textContent='AI 正在生成…';
    try{
      if(AI_TYPE==='image'){
        var imgUrl=await __AI_CAMP__.image(val);
        if(output){if(output.tagName==='IMG'){output.src=imgUrl;output.style.display='block';}else output.innerHTML='<img src="'+imgUrl+'" style="max-width:100%;border-radius:12px" alt="AI生成"/>';}
      }else if(AI_TYPE==='video'){
        var vUrl=await __AI_CAMP__.video(val);
        if(output)output.innerHTML='<video src="'+vUrl+'" controls style="max-width:100%;border-radius:12px"></video>';
      }else{
        var prompt='请为「'+val+'」编一个简短有趣的记忆小故事（80~150字），用简单中文，帮助小学生记住。';
        var text=await __AI_CAMP__.text(prompt,SYSTEM||undefined);
        if(output){if(output.tagName==='INPUT'||output.tagName==='TEXTAREA')output.value=text;else output.textContent=text;}
      }
    }catch(e){
      var msg=(e&&e.message)||'AI 调用失败';
      if(output&&output.tagName!=='BODY'&&output.tagName!=='MAIN')output.textContent='生成失败：'+msg;
      else alert(msg);
    }
    finally{if(loading)loading.style.display='none';}
  }
  function bind(){
    document.querySelectorAll('button,[role=button],.btn,a.button').forEach(function(b){
      if(b.dataset.pmAiBound)return;
      var t=(b.textContent||'').trim();
      if(/生成|魔法|AI|开始|提交|创作|Run|Generate/i.test(t)){
        b.dataset.pmAiBound='1';
        b.addEventListener('click',function(ev){ev.preventDefault();ev.stopImmediatePropagation();runPmAi();},true);
      }
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})();`;
}

function buildWorkflowBridgeScript(flow: AiFlowGraph): string {
  const order = topoOrder(flow).map((n) => ({
    type: n.type,
    system: n.systemPrompt?.trim() || '',
    label: n.label,
  }));
  const flowJson = JSON.stringify(order).replace(/</g, '\\u003c');
  return `(function(){
  if(window.__PM_AI_BRIDGE__)return;
  window.__PM_AI_BRIDGE__=true;
  var FLOW=${flowJson};
  async function runFlow(val){
    var ctx=val;
    for(var i=0;i<FLOW.length;i++){
      var node=FLOW[i];
      if(node.type==='image')ctx=await __AI_CAMP__.image(ctx);
      else if(node.type==='video')ctx=await __AI_CAMP__.video(ctx);
      else ctx=await __AI_CAMP__.text(ctx,node.system||undefined);
    }
    return ctx;
  }
  async function runPmAi(){
    var input=document.querySelector('input:not([type=hidden]),textarea');
    var loading=document.getElementById('aiLoading')||document.querySelector('.loading');
    var output=document.querySelector('[data-ai-output],#aiOutput,#output,#result,.result,main');
    var val=input?String(input.value||'').trim():'';
    if(!val){alert('请先输入内容');return;}
    if(loading)loading.style.display='block';
    try{
      var result=await runFlow(val);
      if(output){if(typeof result==='string'&&result.indexOf('http')===0&&/\\.(png|jpg|jpeg|webp|gif)/i.test(result))
        output.innerHTML='<img src="'+result+'" style="max-width:100%"/>';
      else if(typeof result==='string'&&result.indexOf('http')===0)output.innerHTML='<video src="'+result+'" controls style="max-width:100%"></video>';
      else output.textContent=result;}
    }catch(e){alert((e&&e.message)||'工作流失败');}
    finally{if(loading)loading.style.display='none';}
  }
  function bind(){
    document.querySelectorAll('button,[role=button],.btn').forEach(function(b){
      if(b.dataset.pmAiBound)return;
      if(/生成|魔法|AI|开始|工作流|Run/i.test(b.textContent||'')){
        b.dataset.pmAiBound='1';
        b.addEventListener('click',function(ev){ev.preventDefault();ev.stopImmediatePropagation();runPmAi();},true);
      }
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})();`;
}

/** 去掉平台注入的辅助脚本，只留下页面作者自己写的 JS——
 * 否则声明式桥接脚本自身内部的 __AI_CAMP__ 调用会让"是否已有真实 AI 调用"的判断永远为真。 */
function htmlWithoutInjectedScripts(html: string): string {
  return html
    .replace(/<script\b[^>]*data-ai-camp-runtime[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<script\b[^>]*data-pm-ai-bridge[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<script\b[^>]*data-pm-ai-decl-bridge[^>]*>[\s\S]*?<\/script>/gi, '');
}

/** 页面是否已有真实 AI 调用：手写 __AI_CAMP__.xxx() 或声明式 data-ai-action 标记均算 */
function hasAnyRealAiUsage(html: string): boolean {
  const userHtml = htmlWithoutInjectedScripts(html);
  if (/__AI_CAMP__\s*\.\s*(text|textChat|image|video)\s*\(/.test(userHtml)) return true;
  return /\bdata-ai-action\s*=/.test(userHtml);
}

/** 若 HTML 未包含 __AI_CAMP__ 调用，注入声明式接线脚本（确保按钮能调真实 AI） */
export function ensurePmAppUsesAi(
  html: string,
  config: { singleAi: PmSingleAiConfig } | { aiFlow: AiFlowGraph },
): string {
  let doc = refreshAiCampRuntime(html);
  if (hasAnyRealAiUsage(doc)) return doc;
  const defaultAction =
    'singleAi' in config ? config.singleAi.type : 'text';
  return injectDeclarativeAiBridge(doc, defaultAction);
}

export function buildPmAiRepairPrompt(
  html: string,
  config: { singleAi: PmSingleAiConfig } | { aiFlow: AiFlowGraph },
): string {
  const example =
    'singleAi' in config
      ? buildPmSingleAiCodeExample(config.singleAi)
      : buildPmWorkflowAiCodeExample(config.aiFlow);
  return `以下 HTML 的小应用没有正确调用 AI（可能是写死的假数据）。请重写 JavaScript，必须使用 __AI_CAMP__ 调用真实 AI。

当前 HTML：
${html}

【必须嵌入的核心逻辑示例 — 请融入你的页面结构，给元素分配合适的 id】
${example}

要求：
1. 删除所有写死的 mock 故事/假 AI 结果；点击生成按钮必须 await __AI_CAMP__.text/image/video。
2. 保留原有 UI 风格和布局，保留 <script data-ai-camp-runtime>。
3. 输出完整单文件 HTML，只输出 HTML。`;
}

/** 生成 PM 小应用 HTML：带 aiCamp 标志 + 自动修复/接线 */
export async function generatePmAppWeb(
  prompt: string,
  config: { singleAi: PmSingleAiConfig } | { aiFlow: AiFlowGraph },
  opts?: { enableImageUpload?: boolean },
): Promise<string> {
  async function callWeb(p: string) {
    const r = await generateWebWithQueue({ prompt: p, interactive: true, aiCamp: true });
    return mergeWebHtml({ html: r.html || '', css: r.css || '', js: r.js || '' });
  }
  const first = await callWeb(prompt);
  return finalizePmAppHtml(first, config, callWeb, opts);
}

/** 迭代修改 PM 小应用 */
export async function iteratePmAppWeb(
  prompt: string,
  config: { singleAi: PmSingleAiConfig } | { aiFlow: AiFlowGraph },
  opts?: { enableImageUpload?: boolean; instruction?: string; baseHtml?: string },
): Promise<string> {
  async function callWeb(p: string) {
    const r = await generateWebWithQueue({ prompt: p, interactive: true, aiCamp: true });
    return mergeWebHtml({ html: r.html || '', css: r.css || '', js: r.js || '' });
  }
  let merged = await callWeb(prompt);
  const baseHtml = opts?.baseHtml?.trim();
  const instruction = opts?.instruction || '';
  if (baseHtml && isLikelyBrokenIteration(baseHtml, merged)) {
    merged = await callWeb(
      buildIterationRecoveryPrompt(baseHtml, merged, instruction, '4. 新增 AI 时用 data-ai-action 声明式标记，不要手写 __AI_CAMP__ 拼接到 HTML 属性。'),
    );
    if (isLikelyBrokenIteration(baseHtml, merged)) {
      // 模型仍失败：在上一版完整页面上合并/注入声明式 AI，保证不丢内容且能加上功能
      const salvaged = salvageIterationResult(baseHtml, merged, instruction);
      if (!salvaged) {
        throw new Error('修改后页面内容丢失过多，已中止保存。请换更具体的修改说明后重试，或先在版本树切回上一版。');
      }
      merged = salvaged;
    }
  }
  if (baseHtml && instruction) {
    merged = ensureIterationAiCapabilities(baseHtml, merged, instruction);
  }
  return finalizePmAppHtml(merged, config, callWeb, { ...opts, skipRepair: true });
}

/** 生成/迭代后：若无 AI 调用则修复一次，并注入声明式接线 */
export async function finalizePmAppHtml(
  html: string,
  config: { singleAi: PmSingleAiConfig } | { aiFlow: AiFlowGraph },
  repair: (prompt: string) => Promise<string>,
  opts?: { enableImageUpload?: boolean; instruction?: string; skipRepair?: boolean },
): Promise<string> {
  const defaultAction = 'singleAi' in config ? config.singleAi.type : 'text';
  let out = ensurePmAppUsesAi(html, config);
  const userHasAi = hasAnyRealAiUsage(out);
  if (!opts?.skipRepair && !userHasAi) {
    const repaired = await repair(buildPmAiRepairPrompt(out, config));
    out = ensurePmAppUsesAi(repaired, config);
  }
  return postProcessWebAppHtml(out, {
    enableImageUpload: opts?.enableImageUpload,
    instruction: opts?.instruction,
    defaultAiAction:
      opts?.instruction
        ? inferAiActionFromInstruction(opts.instruction)
        : defaultAction,
  });
}
