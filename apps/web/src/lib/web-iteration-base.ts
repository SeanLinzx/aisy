import { refreshAiCampRuntime, wantsAiFeatures, ensureDeclarativeAiBridge } from '@ai-camp/types';
import { loadWebProjectHead } from '@/lib/web-project-head';
import { versionHtml, type WebProjectVersionRow } from '@/lib/web-project-versions';
import { WEB_ITERATION_DELTA_RULES } from '@/lib/web-iteration-prompt';

/** 去掉平台注入脚本（体积大、不应让模型改写），只保留页面业务 HTML */
export function stripPlatformInjectedScripts(html: string): string {
  if (!html) return html;
  return html
    .replace(/<meta\b[^>]*name=["']ai-camp-api-base["'][^>]*>/gi, '')
    .replace(/<script\b[^>]*data-ai-camp-runtime[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<script\b[^>]*data-pm-ai-bridge[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<script\b[^>]*data-pm-ai-decl-bridge[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<script\b[^>]*data-ai-camp-upload[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<div\b[^>]*data-ai-camp-upload[^>]*>[\s\S]*?<\/div>/gi, '');
}

/**
 * 发给模型的「上一版完整代码」：去掉平台运行时（常 5KB+），只留业务页面，
 * 并保留一个空的 data-ai-camp-runtime 占位标签，提醒模型不要删掉该槽位。
 */
export function prepareIterationSourceForPrompt(html: string): string {
  let out = stripPlatformInjectedScripts(html).trim();
  if (!out) return out;
  const marker = '<script data-ai-camp-runtime><!-- 平台运行时占位，请原样保留此标签，不要填充内容 --><\/script>';
  if (!/data-ai-camp-runtime/i.test(out)) {
    if (/<\/body>/i.test(out)) out = out.replace(/<\/body>/i, `${marker}\n</body>`);
    else if (/<\/head>/i.test(out)) out = out.replace(/<\/head>/i, `${marker}</head>`);
    else out = `${out}\n${marker}`;
  }
  return out;
}

/** 去掉脚本/样式后的大致可见文本长度，用于判断迭代是否「丢内容」 */
function visibleTextLen(html: string): number {
  return stripPlatformInjectedScripts(html)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim().length;
}

/** AI 返回的 HTML 是否疑似丢失了上一版的大部分内容（只比业务 HTML，不含平台脚本） */
export function isLikelyBrokenIteration(baseHtml: string, mergedHtml: string): boolean {
  const base = stripPlatformInjectedScripts(baseHtml);
  const merged = stripPlatformInjectedScripts(mergedHtml || '').trim();
  if (!merged || merged.length < 120) return true;
  if (!/<\s*(html|body|div|main|section|button|input|h1|p)\b/i.test(merged)) return true;

  const baseText = visibleTextLen(base);
  const mergedText = visibleTextLen(merged);
  // 可见文案丢了大半才算坏（放宽阈值，避免样式精简误判）
  if (baseText > 180 && mergedText < baseText * 0.35) return true;
  // 业务 HTML 体积骤降才算坏（平台脚本已剥离，阈值可更严）
  if (base.length > 800 && merged.length < base.length * 0.28) return true;

  const baseButtons = (base.match(/<button\b/gi) || []).length;
  const mergedButtons = (merged.match(/<button\b/gi) || []).length;
  if (baseButtons >= 2 && mergedButtons === 0) return true;

  const baseImgs = (base.match(/<img\b/gi) || []).length;
  const mergedImgs = (merged.match(/<img\b/gi) || []).length;
  if (baseImgs >= 2 && mergedImgs < baseImgs * 0.5) return true;

  const baseVideos = (base.match(/<video\b/gi) || []).length;
  const mergedVideos = (merged.match(/<video\b/gi) || []).length;
  if (baseVideos >= 1 && mergedVideos === 0) return true;

  const baseDataIds = (base.match(/\bdata-ai-action\b/gi) || []).length;
  const mergedDataIds = (merged.match(/\bdata-ai-action\b/gi) || []).length;
  if (baseDataIds >= 1 && mergedDataIds === 0) return true;

  return false;
}

function insertBeforeBodyEnd(html: string, fragment: string): string {
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${fragment}\n</body>`);
  return `${html}\n${fragment}`;
}

/** 从自然语言修改意见推断应接入的 AI 能力类型 */
export function inferAiActionFromInstruction(instruction: string): 'text' | 'image' | 'video' {
  if (/生图|配图|解释图|插图|图片生成|AI图|画一张|生成图|记忆配图|记忆图/i.test(instruction)) return 'image';
  if (/生视频|视频生成|拍一段/i.test(instruction)) return 'video';
  return 'text';
}

export function hasDeclarativeAiAction(html: string, action?: 'text' | 'image' | 'video'): boolean {
  const user = stripPlatformInjectedScripts(html);
  if (action) return new RegExp(`data-ai-action\\s*=\\s*["']${action}["']`, 'i').test(user);
  return /data-ai-action\s*=\s*["'](text|image|video)["']/i.test(user);
}

/** 页面是否仍含 mock / 写死 AI 结果（需改为声明式真实调用） */
export function hasMockAiUsage(html: string): boolean {
  const user = stripPlatformInjectedScripts(html).replace(
    /<script\b[^>]*data-pm-ai-decl-bridge[^>]*>[\s\S]*?<\/script>/gi,
    '',
  );
  if (/假数据|mock|fakeAi|硬编码|picsum|placeholder\.com|写死的.*故事/i.test(user)) return true;
  if (/src=["']\+|href=["']\+/.test(user)) return true;
  if (/\.innerHTML\s*=\s*['"][^'"]{60,}['"]/.test(user) && !/__AI_CAMP__/.test(user)) return true;
  return false;
}

function findImageOutputId(html: string): { id: string; exists: boolean } {
  const m = html.match(/<img\b[^>]*\bid=["']([^"']+)["'][^>]*>/i);
  if (m?.[1]) return { id: m[1], exists: true };
  return { id: `aiImg_${Date.now().toString(36)}`, exists: false };
}

/**
 * 给页面上已有的「生成」类按钮补上 data-ai-action，避免模型只写了 mock 或漏加属性。
 */
export function wireExistingButtonsForAi(html: string, instruction: string): string {
  if (!wantsAiFeatures(instruction)) return html;
  const action = inferAiActionFromInstruction(instruction);
  let out = stripPlatformInjectedScripts(html);
  let wired = false;
  const { id: outputId, exists: hasImg } = findImageOutputId(out);

  out = out.replace(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi, (match, attrs: string, inner: string) => {
    if (/data-ai-action/i.test(attrs)) {
      wired = true;
      return match;
    }
    const label = inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const shouldWire =
      action === 'image'
        ? /生成|配图|生图|画图|插图|记忆|图|AI/i.test(label)
        : action === 'video'
          ? /生成|视频|AI/i.test(label)
          : /生成|AI|助手|记忆|妙招/i.test(label);
    if (!shouldWire) return match;

    wired = true;
    let newAttrs = attrs.replace(/\sdata-ai-action\s*=\s*["'][^"']*["']/gi, '');
    newAttrs += ` data-ai-action="${action}" data-ai-input="input:not([type=hidden]):not([type=file]),textarea"`;
    if (action === 'image') {
      newAttrs += ` data-ai-output="#${outputId}" data-ai-prompt="可爱卡通风格，色彩明亮，适合儿童的解释配图，画面简洁无文字"`;
    } else if (action === 'video') {
      newAttrs += ` data-ai-output="#${outputId}" data-ai-prompt="适合小朋友观看的短视频"`;
    } else {
      newAttrs += ` data-ai-output="[data-ai-output],#${outputId}" data-ai-system="你是友好的儿童 AI 助手，用简单中文回答"`;
    }
    return `<button${newAttrs}>${inner}</button>`;
  });

  if (wired && action === 'image' && !hasImg) {
    const imgTag = `<img id="${outputId}" alt="AI生成配图" style="max-width:100%;border-radius:12px;margin-top:12px;display:none" />`;
    out = insertBeforeBodyEnd(out, imgTag);
  }

  return wired ? refreshAiCampRuntime(out) : refreshAiCampRuntime(html);
}

/** 迭代完成后：确保声明式 AI 已接上，mock 被替换 */
export function ensureIterationAiCapabilities(baseHtml: string, mergedHtml: string, instruction: string): string {
  if (!wantsAiFeatures(instruction)) return ensureDeclarativeAiBridge(mergedHtml);
  const action = inferAiActionFromInstruction(instruction);
  let out = mergedHtml;

  const ok = hasDeclarativeAiAction(out, action) && !hasMockAiUsage(out);
  if (ok) return ensureDeclarativeAiBridge(out);

  out = wireExistingButtonsForAi(out, instruction);
  if (hasDeclarativeAiAction(out, action) && !hasMockAiUsage(out)) return ensureDeclarativeAiBridge(out);

  if (hasMockAiUsage(out) || !hasDeclarativeAiAction(out, action)) {
    const salvaged = salvageIterationResult(baseHtml, out, instruction);
    if (salvaged) out = salvaged;
    else if (!hasDeclarativeAiAction(out, action)) out = injectDeclarativeAiFeature(baseHtml, instruction);
  }

  return ensureDeclarativeAiBridge(out);
}

/** 根据修改意见在上一版上注入声明式 AI UI（模型失败时的可靠兜底） */
export function injectDeclarativeAiFeature(baseHtml: string, instruction: string): string {
  let action: 'text' | 'image' | 'video' = 'text';
  if (/生图|配图|解释图|插图|图片生成|AI图|画一张|生成图/i.test(instruction)) action = 'image';
  else if (/生视频|视频生成|拍一段/i.test(instruction)) action = 'video';

  const base = stripPlatformInjectedScripts(baseHtml);
  if (new RegExp(`data-ai-action\\s*=\\s*["']${action}["']`, 'i').test(base)) {
    return refreshAiCampRuntime(base);
  }

  const uid = `aiFeat_${action}_${Date.now().toString(36)}`;
  let fragment = '';
  if (action === 'image') {
    fragment = `
<div data-ai-feature="image" style="margin-top:16px;text-align:center">
  <button type="button" class="btn" data-ai-action="image" data-ai-input="input:not([type=hidden]),textarea" data-ai-output="#${uid}" data-ai-prompt="可爱卡通风格，色彩明亮，适合儿童的解释配图，画面简洁无文字">🎨 生成解释图</button>
  <img id="${uid}" alt="AI解释图" style="max-width:100%;border-radius:12px;margin-top:12px;display:none" />
</div>`;
  } else if (action === 'video') {
    fragment = `
<div data-ai-feature="video" style="margin-top:16px;text-align:center">
  <button type="button" class="btn" data-ai-action="video" data-ai-input="input:not([type=hidden]),textarea" data-ai-output="#${uid}" data-ai-prompt="适合小朋友观看的短视频">🎬 生成短视频</button>
  <div id="${uid}" style="margin-top:12px"></div>
</div>`;
  } else {
    fragment = `
<div data-ai-feature="text" style="margin-top:16px;text-align:center">
  <button type="button" class="btn" data-ai-action="text" data-ai-input="input:not([type=hidden]),textarea" data-ai-output="#${uid}" data-ai-system="你是友好的儿童 AI 助手，用简单中文回答">✨ AI 生成</button>
  <div id="${uid}" data-ai-output style="margin-top:12px;padding:12px;border-radius:12px;background:#faf5ff;min-height:48px;text-align:left;white-space:pre-wrap"></div>
</div>`;
  }

  // 优先插在主卡片末尾，否则 body 末尾
  let out = base;
  if (/<\/div>\s*<\/body>/i.test(out)) {
    out = out.replace(/<\/div>\s*<\/body>/i, `${fragment}</div></body>`);
  } else {
    out = insertBeforeBodyEnd(out, fragment);
  }
  return refreshAiCampRuntime(out);
}

/**
 * 模型输出「坏了」时：尽量把候选里的声明式 AI 片段合回上一版；
 * 若修改意见明确要加 AI 功能，则直接在上一版注入声明式 UI。
 * 返回 null 表示无法抢救。
 */
export function salvageIterationResult(
  baseHtml: string,
  candidateHtml: string,
  instruction: string,
): string | null {
  const base = stripPlatformInjectedScripts(baseHtml);
  const cand = stripPlatformInjectedScripts(candidateHtml || '');

  const buttons = [...cand.matchAll(/<button\b[^>]*\bdata-ai-action\b[^>]*>[\s\S]*?<\/button>/gi)].map((m) => m[0]);
  const outputs = [
    ...cand.matchAll(/<img\b[^>]*\bid=["'][^"']+["'][^>]*\/?>/gi),
    ...cand.matchAll(/<(?:div|section|p)\b[^>]*(?:\bid=["'][^"']*(?:img|image|result|output)[^"']*["']|\bdata-ai-output\b)[^>]*>[\s\S]*?<\/(?:div|section|p)>/gi),
  ].map((m) => m[0]);

  if (buttons.length > 0) {
    const already = buttons.every((b) => base.includes(b.slice(0, Math.min(80, b.length))));
    if (!already) {
      const frag = `\n<!-- AI 迭代合并 -->\n${buttons.join('\n')}\n${outputs.join('\n')}\n`;
      return refreshAiCampRuntime(insertBeforeBodyEnd(base, frag));
    }
  }

  if (wantsAiFeatures(instruction)) {
    return injectDeclarativeAiFeature(baseHtml, instruction);
  }

  return null;
}

export type ResolveIterationBaseOpts = {
  projectId?: string | null;
  activeVersionId?: string | null;
  versions?: WebProjectVersionRow[];
  htmlState?: string;
  lastRefHtml?: string;
};

export type ResolveIterationBaseResult = {
  html: string;
  /** 预览与 server 版本差异较大时提示用户 */
  previewDiffersFromServer?: boolean;
};

/** 预览与 server 可见文本长度差超过 15% 时视为不一致 */
function previewDiffersFromServer(previewHtml: string, serverHtml: string): boolean {
  const a = visibleTextLen(previewHtml);
  const b = visibleTextLen(serverHtml);
  if (a < 40 || b < 40) return previewHtml.trim() !== serverHtml.trim();
  const ratio = Math.abs(a - b) / Math.max(a, b, 1);
  return ratio > 0.15;
}

async function loadServerBaseHtml(
  projectId: string,
  activeVersionId?: string | null,
): Promise<string> {
  try {
    const headState = await loadWebProjectHead(projectId);
    if (!headState) return '';
    const pick =
      (activeVersionId && headState.versions.find((v) => v.id === activeVersionId)) ||
      (headState.headVersionId && headState.versions.find((v) => v.id === headState.headVersionId)) ||
      headState.versions[0];
    if (pick) {
      const fromServer = refreshAiCampRuntime(versionHtml(pick));
      if (fromServer.trim().length > 80) return fromServer;
    }
    if (headState.headHtml.trim().length > 80) {
      return refreshAiCampRuntime(headState.headHtml);
    }
  } catch {
    /* fall through */
  }
  return '';
}

/**
 * 解析「应用修改」应基于的完整 HTML：优先用户当前预览，再回退本地/server 版本。
 */
export async function resolveIterationBaseHtml(
  opts: ResolveIterationBaseOpts,
): Promise<ResolveIterationBaseResult> {
  const { projectId, activeVersionId, versions = [], htmlState = '', lastRefHtml = '' } = opts;

  const preview = (htmlState || lastRefHtml || '').trim();
  const previewReady = preview.length > 80 ? refreshAiCampRuntime(preview) : '';

  if (previewReady) {
    let differs = false;
    if (projectId) {
      const fromServer = await loadServerBaseHtml(projectId, activeVersionId);
      if (fromServer.trim().length > 80) {
        differs = previewDiffersFromServer(previewReady, fromServer);
      }
    }
    return { html: previewReady, previewDiffersFromServer: differs || undefined };
  }

  if (activeVersionId && versions.length) {
    const local = versions.find((v) => v.id === activeVersionId);
    if (local) {
      const fromLocal = refreshAiCampRuntime(versionHtml(local));
      if (fromLocal.trim().length > 80) return { html: fromLocal };
    }
  }

  if (projectId) {
    const fromServer = await loadServerBaseHtml(projectId, activeVersionId);
    if (fromServer.trim().length > 80) return { html: fromServer };
  }

  const fallback = (lastRefHtml || htmlState || '').trim();
  return fallback ? { html: refreshAiCampRuntime(fallback) } : { html: '' };
}

/**
 * 迭代失败时的补救 prompt：强制带上上一版完整业务 HTML（不含平台运行时大脚本）。
 */
export function buildIterationRecoveryPrompt(
  baseHtml: string,
  _badHtml: string,
  instruction: string,
  extraRules = '',
): string {
  const source = prepareIterationSourceForPrompt(baseHtml);
  return `【严重错误】你上次的输出丢失了上一版的大部分内容与结构（或为空白页）。必须严格在下面「上一版完整 HTML」上做最小化增量修改，禁止推倒重来、禁止输出空白页或无关新页面。

【上一版完整 HTML — 唯一合法基础，必须完整保留所有未要求删除的内容】
${source}

【修改意见】
${instruction.trim()}

要求：
${WEB_ITERATION_DELTA_RULES}
${extraRules}
1. 输出完整单文件 HTML（含内联 CSS 与 JavaScript），只输出 HTML，不要 Markdown 代码块。
2. 保留空的 <script data-ai-camp-runtime> 占位标签即可，不要自己写运行时内容。
3. 除修改意见明确要求外，不得删除上一版的区块、文案、按钮、样式与功能。
4. 新增 AI 功能请只用 data-ai-action="text|image|video" 等声明式属性。`;
}
