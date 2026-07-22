import { Logger } from '@nestjs/common';
import { request } from 'undici';
import {
  assertVideoReferenceImageMime,
  getPublicUploadBase,
  imageBytesToDataUri,
  readImageBytes,
  readUploadFile,
  mimeFromExt,
} from '../../../common/utils/image-store';
import {
  humanizeArkGenerationError,
  humanizeArkVideoError,
  sanitizeCopyrightTerms,
} from '../../../common/utils/prompt-sanitize';
import {
  AiProviderAdapter,
  BaseGenerateInput,
  ImageResult,
  MixedContentResult,
  PosterResult,
  PptResult,
  ProviderCapabilities,
  TextResult,
  VideoSubmitInput,
  VideoTaskResult,
  WebPageResult,
} from '../ai.types';

export interface VolcengineArkConfig {
  apiKey: string;
  baseUrl: string;
  responsesPath: string;
  videoTasksPath: string;
  imagesPath: string;
  textModel?: string;
  imageModel?: string;
  videoModel?: string;
  multimodalModel?: string;
  /** AI 小应用（长上下文）网页生成 */
  webModel?: string;
  chatCompletionsPath?: string;
}

/**
 * Volcengine Ark provider.
 *
 * This provider wraps two official endpoints shown in the project spec:
 *   1. POST {base}/responses
 *      Multimodal / text generation ("doubao-seed-..." family).
 *      Input format:
 *        { model, input: [{ role, content: [{ type: 'input_text' | 'input_image', ... }]}]}
 *
 *   2. POST {base}/contents/generations/tasks
 *      Async video generation ("doubao-seedance-...").
 *      Input format:
 *        { model, content: [{ type: 'text' | 'image_url' | 'video_url' | 'audio_url', ..., role? }], ...options }
 *
 * Both examples live verbatim in `docs/volcengine-ark.md` for reference.
 *
 * A few practical notes baked into the code:
 *   - Text / web / poster / ppt / code all go through /responses using the same
 *     multimodal model, varying only in the system prompt.
 *   - Video submit returns an opaque `task_id`. The exact GET path for polling
 *     is not finalized in the reference spec, so we try the most obvious URL
 *     shape (`GET {videoTasksPath}/{id}`) and degrade gracefully.
 *   - Anything that fails (e.g. missing model, network error) surfaces as a
 *     `failed` status upstream so the UX can fall back or show a clear message.
 */
/** Seedance 2.0 Mini — 官方推荐用于 /contents/generations/tasks */
export const DEFAULT_ARK_VIDEO_MODEL = 'doubao-seedance-2-0-mini-260615';

const LEGACY_ARK_VIDEO_MODEL = 'doubao-seedance-2-0-260128';

export function resolveArkVideoModel(model?: string, configured?: string): string {
  const fallback = configured || DEFAULT_ARK_VIDEO_MODEL;
  if (!model || model === LEGACY_ARK_VIDEO_MODEL) return fallback;
  return model;
}

export class VolcengineArkProvider implements AiProviderAdapter {
  readonly name = 'volcengine-ark';
  readonly capabilities: ProviderCapabilities = {
    text: true,
    image: true,
    video: true,
    web: true,
    poster: true,
    ppt: true,
    mixed: true,
    code: true,
  };
  private readonly logger = new Logger('VolcengineArk');

  constructor(private readonly cfg: VolcengineArkConfig) {
    if (cfg.imageModel) {
      this.capabilities.image = true;
    }
  }

  private url(path: string): string {
    const base = this.cfg.baseUrl.replace(/\/+$/, '');
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${base}${p}`;
  }

  private headers() {
    return {
      'content-type': 'application/json',
      authorization: `Bearer ${this.cfg.apiKey}`,
    };
  }

  /**
   * 守护性超时：/responses 为同步生成，长文/网页可达数分钟；
   * 不设超时的话，挂起的上游连接会在多端并发时逐渐耗尽 socket。
   */
  /** 网页/工作流类小应用生成常带整页历史代码作为上下文，模型完整生成耗时可达 5-7 分钟 */
  private static readonly SLOW_TIMEOUTS = { headersTimeout: 420_000, bodyTimeout: 300_000 };
  private static readonly FAST_TIMEOUTS = { headersTimeout: 30_000, bodyTimeout: 60_000 };

  private async callResponses(model: string, systemPrompt: string, input: BaseGenerateInput): Promise<any> {
    const history = input.options?.messages as Array<{ role: 'user' | 'assistant'; content: string }> | undefined;
    const inputArr: any[] = [
      { role: 'system', content: [{ type: 'input_text', text: systemPrompt }] },
    ];

    if (history?.length) {
      for (const msg of history) {
        inputArr.push({
          role: msg.role,
          content: [{ type: 'input_text', text: msg.content }],
        });
      }
    }

    const contentBlocks: any[] = [];
    if (input.references?.length) {
      for (const ref of input.references) {
        if (ref.type === 'image') {
          contentBlocks.push({ type: 'input_image', image_url: ref.url });
        }
      }
    }
    if (input.prompt?.trim()) {
      contentBlocks.push({ type: 'input_text', text: input.prompt });
    }

    inputArr.push({
      role: 'user',
      content: contentBlocks.length ? contentBlocks : [{ type: 'input_text', text: input.prompt || '继续' }],
    });

    const body = {
      model,
      input: inputArr,
    };

    let res: Awaited<ReturnType<typeof request>>;
    try {
      res = await request(this.url(this.cfg.responsesPath), {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(body),
        ...VolcengineArkProvider.SLOW_TIMEOUTS,
      });
    } catch (e) {
      throw humanizeArkGenerationError(e);
    }
    const text = await res.body.text();
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(`Ark /responses returned non-JSON: ${text.slice(0, 200)}`);
    }
    if (res.statusCode >= 400) {
      throw new Error(`Ark /responses failed (${res.statusCode}): ${parsed?.error?.message || parsed?.message || text.slice(0, 200)}`);
    }
    return parsed;
  }

  /** doubao-seed-evolving 等长上下文模型走 /chat/completions */
  private async callChatCompletions(model: string, systemPrompt: string, input: BaseGenerateInput): Promise<any> {
    const history = input.options?.messages as Array<{ role: 'user' | 'assistant'; content: string }> | undefined;
    const messages: Array<{ role: string; content: string }> = [{ role: 'system', content: systemPrompt }];

    if (history?.length) {
      for (const msg of history) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    messages.push({ role: 'user', content: input.prompt?.trim() || '继续' });

    const path = this.cfg.chatCompletionsPath || '/chat/completions';
    const body = { model, messages, max_tokens: 32768 };

    let res: Awaited<ReturnType<typeof request>>;
    try {
      res = await request(this.url(path), {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(body),
        ...VolcengineArkProvider.SLOW_TIMEOUTS,
      });
    } catch (e) {
      throw humanizeArkGenerationError(e);
    }
    const text = await res.body.text();
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(`Ark /chat/completions returned non-JSON: ${text.slice(0, 200)}`);
    }
    if (res.statusCode >= 400) {
      throw new Error(
        `Ark /chat/completions failed (${res.statusCode}): ${parsed?.error?.message || parsed?.message || text.slice(0, 200)}`,
      );
    }
    return parsed;
  }

  private async callTextGeneration(model: string, systemPrompt: string, input: BaseGenerateInput): Promise<any> {
    const useChat = model === this.cfg.webModel || model.includes('seed-evolving');
    if (useChat && this.cfg.webModel) {
      return this.callChatCompletions(model, systemPrompt, input);
    }
    return this.callResponses(model, systemPrompt, input);
  }

  private extractText(resp: any): string {
    // The Ark /responses API mirrors the OpenAI "Responses" style.
    // We try a few paths to be robust against minor schema variations.
    if (typeof resp?.output_text === 'string') return resp.output_text;
    const out = resp?.output ?? resp?.data?.output ?? [];
    const chunks: string[] = [];
    if (Array.isArray(out)) {
      for (const item of out) {
        const contents = item?.content ?? [];
        if (Array.isArray(contents)) {
          for (const c of contents) {
            if (typeof c?.text === 'string') chunks.push(c.text);
            else if (typeof c?.output_text === 'string') chunks.push(c.output_text);
          }
        }
      }
    }
    if (chunks.length) return chunks.join('\n');
    // Fallbacks: Choices style (OpenAI chat).
    if (Array.isArray(resp?.choices)) {
      const msg = resp.choices[0]?.message?.content;
      if (typeof msg === 'string') return msg;
      if (Array.isArray(msg)) return msg.map((m) => m?.text ?? '').join('');
    }
    return typeof resp?.text === 'string' ? resp.text : '';
  }

  async generateText(input: BaseGenerateInput): Promise<TextResult> {
    const model = input.model || this.cfg.textModel || this.cfg.multimodalModel;
    if (!model) throw new Error('未配置文本模型 (ARK_TEXT_MODEL / ARK_MULTIMODAL_MODEL)');
    const systemPrompt =
      typeof input.options?.system === 'string'
        ? input.options.system
        : '你是一个面向小学生的友好创作助理。请用清晰、正面、积极的中文回答，并避免不适合儿童的内容。';
    const resp = await this.callResponses(model, systemPrompt, input);
    return { text: this.extractText(resp), raw: resp };
  }

  /**
   * 把媒体 URL 转成方舟可直接接收的形式。
   * - 已是 data URI：原样返回。
   * - 本地上传（含 `/uploads/xxx` 相对路径）：读磁盘转 base64 data URI。
   * - 公网 HTTPS（keepPublicHttp）：原样返回，由方舟自行下载。
   * - 其它 URL：服务端拉取后转 base64。
   */
  private async toMediaDataUri(url: string, defaultMime: string, keepPublicHttp = false): Promise<string> {
    if (!url) return url;
    if (url.startsWith('data:')) return url;

    const local = readUploadFile(url);
    if (local) {
      const ct = mimeFromExt(local.ext) || defaultMime;
      return `data:${ct};base64,${local.buf.toString('base64')}`;
    }

    if (keepPublicHttp && /^https?:\/\//.test(url)) {
      return url;
    }

    try {
      const res = await request(url, { method: 'GET', ...VolcengineArkProvider.SLOW_TIMEOUTS });
      if (res.statusCode >= 400) return url;
      const ct = ((res.headers['content-type'] as string) || defaultMime).split(';')[0].trim();
      const ab = await res.body.arrayBuffer();
      return `data:${ct};base64,${Buffer.from(ab).toString('base64')}`;
    } catch {
      return url;
    }
  }

  /** 生产环境公网 uploads URL 直传 Ark，避免 base64 膨胀；localhost 仍 inline。 */
  private keepPublicImageUrl(url: string): boolean {
    if (!/^https?:\/\//.test(url)) return false;
    try {
      const u = new URL(url);
      if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return false;
    } catch {
      return false;
    }
    const base = getPublicUploadBase();
    if (!url.startsWith(`${base}/`)) return false;
    try {
      const bu = new URL(base);
      return bu.protocol === 'https:' && bu.hostname !== 'localhost' && bu.hostname !== '127.0.0.1';
    } catch {
      return false;
    }
  }

  private toImagePayload(url: string): Promise<string> {
    return this.toMediaDataUri(url, 'image/png', this.keepPublicImageUrl(url));
  }

  private toVideoPayload(url: string): Promise<string> {
    return this.toMediaDataUri(url, 'video/mp4', true);
  }

  private toAudioPayload(url: string): Promise<string> {
    return this.toMediaDataUri(url, 'audio/mpeg', true);
  }

  /** 按官方示例：text 在前，再按 图片 → 视频 → 音频 顺序编号（图片1、视频1、音频1…） */
  private buildVideoPrompt(input: VideoSubmitInput): string {
    const refs = input.references || [];
    const images = refs.filter((r) => r.type === 'image');
    const videos = refs.filter((r) => r.type === 'video');
    const audios = refs.filter((r) => r.type === 'audio');
    const hasFirstLast = images.some((r) => r.role === 'first_frame') && images.some((r) => r.role === 'last_frame');
    const userText = sanitizeCopyrightTerms(input.prompt.trim());
    const safeHint = '保持与参考素材一致的原创卡通角色外观，不要提及受版权保护的角色或品牌名称。';

    const refHints: string[] = [];
    if (videos.length === 1) refHints.push('全程使用视频1的第一视角构图与运镜风格');
    else if (videos.length > 1) refHints.push('全程参考视频1至视频' + videos.length + '的镜头语言');
    if (audios.length === 1) refHints.push('背景声音统一使用音频1');
    else if (audios.length > 1) refHints.push('背景声音统一参考音频1等素材');

    if (hasFirstLast) {
      return [
        '根据图片1作为首帧、图片2作为尾帧，生成两者之间的过渡视频。',
        safeHint,
        ...refHints,
        userText,
        '画面从图片1自然过渡到图片2，尾帧定格为图片2。',
      ].filter(Boolean).join(' ');
    }

    const sceneHints: string[] = [];
    if (images.length === 1) sceneHints.push('首帧为图片1');
    else if (images.length >= 2) sceneHints.push('首帧为图片1，尾帧定格为图片2');

    const prefix = [safeHint, ...refHints, sceneHints.join('，')].filter(Boolean).join(' ');
    return prefix ? `${prefix}。${userText}` : userText;
  }

  private normalizeVideoImageRole(role?: string): string {
    if (!role || role === 'first_frame' || role === 'last_frame') return 'reference_image';
    return role;
  }

  private parseImageGenerationResponse(parsed: any): string[] {
    const urls: string[] = [];
    const items = Array.isArray(parsed?.data) ? parsed.data : [];
    for (const it of items) {
      if (typeof it?.url === 'string') urls.push(it.url);
      else if (typeof it?.b64_json === 'string') urls.push(`data:image/png;base64,${it.b64_json}`);
    }
    return urls;
  }

  private async postImageGeneration(body: Record<string, unknown>): Promise<{ urls: string[]; raw: any }> {
    const res = await request(this.url(this.cfg.imagesPath), {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
      ...VolcengineArkProvider.SLOW_TIMEOUTS,
    });
    const text = await res.body.text();
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(`Ark /images/generations returned non-JSON: ${text.slice(0, 200)}`);
    }
    if (res.statusCode >= 400) {
      throw new Error(`Ark /images/generations failed (${res.statusCode}): ${parsed?.error?.message || text.slice(0, 200)}`);
    }
    return { urls: this.parseImageGenerationResponse(parsed), raw: parsed };
  }

  private buildImageRequestBody(
    model: string,
    input: BaseGenerateInput,
    opts: {
      isSeedream5: boolean;
      size: string;
      watermark: boolean;
      sequential: string;
      stream: boolean;
      count: number;
      refImages: string[];
    },
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model,
      prompt: input.prompt,
      size: opts.size,
      response_format: 'url',
    };

    if (opts.isSeedream5) {
      body.sequential_image_generation = opts.sequential;
      body.stream = opts.stream;
      body.watermark = opts.watermark;
      if (opts.sequential === 'auto' && opts.count > 1) {
        body.sequential_image_generation_options = { max_images: opts.count };
      }
    } else {
      body.n = opts.count;
      if (input.options?.seed !== undefined) body.seed = input.options.seed;
      if (input.options?.guidance_scale !== undefined) body.guidance_scale = input.options.guidance_scale;
      if (opts.watermark !== undefined) body.watermark = opts.watermark;
    }

    if (opts.refImages.length) body.image = opts.refImages;
    return body;
  }

  async generateImage(input: BaseGenerateInput): Promise<ImageResult> {
    const model = input.model || this.cfg.imageModel;
    if (!model) {
      throw new Error('未配置图片模型（ARK_IMAGE_MODEL）。请在管理员后台或环境变量中配置后再试。');
    }

    const count = Math.min(Math.max(Number(input.options?.n) || 1, 1), 4);
    const isSeedream5 = /seedream-5/i.test(model);
    const size = resolveArkImageSize(input.options?.size, isSeedream5);
    const watermark = input.options?.watermark !== undefined ? input.options.watermark : false;
    const sequential = input.options?.sequential_image_generation ?? 'disabled';
    const stream = input.options?.stream ?? false;

    const refImageUrls = (input.references || []).filter((r) => r.type === 'image').map((r) => r.url);
    const refImages = await Promise.all(refImageUrls.map((u) => this.toImagePayload(u)));

    const baseOpts = { isSeedream5, size, watermark, sequential, stream, refImages };
    let urls: string[] = [];
    let lastRaw: any;

    if (isSeedream5 && count > 1 && sequential === 'auto') {
      const body = this.buildImageRequestBody(model, input, { ...baseOpts, count, sequential: 'auto' });
      const result = await this.postImageGeneration(body);
      urls = result.urls;
      lastRaw = result.raw;
    } else if (isSeedream5 && count > 1) {
      const results = await Promise.all(
        Array.from({ length: count }, () =>
          this.postImageGeneration(
            this.buildImageRequestBody(model, input, { ...baseOpts, count: 1, sequential: 'disabled' }),
          ),
        ),
      );
      for (const r of results) {
        urls.push(...r.urls);
        lastRaw = r.raw;
      }
    } else if (!isSeedream5 && count > 1) {
      const body = this.buildImageRequestBody(model, input, { ...baseOpts, count });
      const result = await this.postImageGeneration(body);
      urls = result.urls;
      lastRaw = result.raw;
    } else {
      const body = this.buildImageRequestBody(model, input, { ...baseOpts, count: 1, sequential: 'disabled' });
      const result = await this.postImageGeneration(body);
      urls = result.urls;
      lastRaw = result.raw;
    }

    if (urls.length === 0) {
      throw new Error('Ark /images/generations 未返回图片');
    }
    return { imageUrls: urls, raw: lastRaw };
  }

  async generateWebPage(input: BaseGenerateInput): Promise<WebPageResult> {
    const interactive = Boolean(input.options?.interactive);
    const aiCamp = Boolean(input.options?.aiCamp);
    const model =
      input.model ||
      (aiCamp && this.cfg.webModel ? this.cfg.webModel : this.cfg.multimodalModel || this.cfg.textModel);
    if (!model) throw new Error('未配置网页生成模型');
    const aiCampRules = aiCamp
      ? ' 页面会通过 <script data-ai-camp-runtime> 注入 window.__AI_CAMP__ 对象（含 text/image/video/uploadImage/pickImageFile 方法）。你必须在 <script> 里写 await __AI_CAMP__.text(...) / .image(...) / .video(...) / .uploadImage(file) / .pickImageFile()，禁止在 JavaScript 里写死 mock 故事、假 AI 结果或硬编码模板；点击生成按钮时必须实时调用 __AI_CAMP__ 获取结果并展示。若需要用户上传图片，使用 <input type="file" accept="image/*"> 配合 __AI_CAMP__.uploadImage。'
      : '';
    const systemPrompt = interactive
      ? `你是一名擅长做儿童友好交互网页的前端专家。请只输出一个完整的、可独立运行的 HTML 文档，使用内联 <style> 和 <script>，实现用户描述的点击、悬停、动画或音效等交互。不要使用外链 JS/CSS/字体。图片/视频/音频可以使用用户提示词「作品清单」中明确给出的完整 URL（含 /uploads/ 与 https 媒体地址），必须用 <img>/<video>/<audio> 按清单原样嵌入，严禁省略清单中的媒体，也严禁使用清单未列出的外部图片或未知 CDN。严禁 document.write、eval、iframe。确保视觉活泼、配色明亮、结构清晰、移动端自适应。${aiCampRules} 只输出 HTML，不要说明文字，不要使用 Markdown 代码块包裹。`
      : '你是一名擅长做儿童友好网页的前端专家。请只输出一个完整的、可独立运行的 HTML 文档，使用内联 <style>，不要使用 <script> 或外链 JS。图片/视频/音频可以使用用户提示词中明确给出的完整 URL（含 /uploads/），必须按清单嵌入。严禁使用 document.write、eval、iframe。确保视觉活泼、配色明亮、结构清晰、移动端自适应。只输出 HTML，不要说明文字，不要使用 Markdown 代码块包裹。';
    const resp = await this.callTextGeneration(model, systemPrompt, {
      ...input,
      options: {
        ...input.options,
        messages: input.options?.messages,
      },
    });
    const raw = this.extractText(resp).trim();
    const html = stripMarkdownFence(raw);
    return { html, raw: resp };
  }

  async generatePoster(input: BaseGenerateInput): Promise<PosterResult> {
    const webResult = await this.generateWebPage({
      ...input,
      prompt: `请把下面的海报需求转成一张 HTML 海报（单文件、内联 CSS，按需求中的比例与展示设备排版，适合打印和屏幕展示）：\n\n${input.prompt}`,
    });
    return { html: webResult.html, raw: webResult.raw };
  }

  async generatePpt(input: BaseGenerateInput): Promise<PptResult> {
    const model = input.model || this.cfg.multimodalModel || this.cfg.textModel;
    if (!model) throw new Error('未配置 PPT 生成模型');
    const resp = await this.callResponses(
      model,
      '你是一名老师助理，请为小学生生成 5~8 页的 PPT 结构。严格输出 JSON 数组，格式为 [{"title":"...","body":"..."}]，不要输出任何解释或 markdown 代码块。',
      input,
    );
    const text = this.extractText(resp);
    const slides = tryParseSlides(text);
    return { slides, raw: resp };
  }

  async generateMixedContent(input: BaseGenerateInput): Promise<MixedContentResult> {
    const model = input.model || this.cfg.multimodalModel;
    if (!model) throw new Error('未配置多模态模型 (ARK_MULTIMODAL_MODEL)');
    const resp = await this.callResponses(
      model,
      '你是一名耐心的图文理解老师。请结合用户上传的图片内容回答问题，语气友好，并使用简单易懂的中文。',
      input,
    );
    return { text: this.extractText(resp), raw: resp };
  }

  async generateCode(input: BaseGenerateInput): Promise<TextResult> {
    const model = input.model || this.cfg.textModel || this.cfg.multimodalModel;
    if (!model) throw new Error('未配置文本模型');
    const resp = await this.callResponses(
      model,
      '你是一名代码助教，为小朋友生成简洁安全的示例代码。只输出代码本体，不要包裹 Markdown 代码块。',
      input,
    );
    return { text: stripMarkdownFence(this.extractText(resp)), raw: resp };
  }

  async submitVideoTask(input: VideoSubmitInput): Promise<VideoTaskResult> {
    const model = resolveArkVideoModel(input.model, this.cfg.videoModel);
    if (!model) throw new Error('未配置视频模型 (ARK_VIDEO_MODEL)');

    const refs = input.references || [];
    const images = refs.filter((r) => r.type === 'image');
    const videos = refs.filter((r) => r.type === 'video');
    const audios = refs.filter((r) => r.type === 'audio');

    const content: any[] = [{ type: 'text', text: this.buildVideoPrompt(input) }];

    for (const r of images) {
      const url = await this.toImagePayload(r.url);
      content.push({
        type: 'image_url',
        image_url: { url },
        role: this.normalizeVideoImageRole(r.role),
      });
    }
    for (const r of videos) {
      const url = await this.toVideoPayload(r.url);
      content.push({
        type: 'video_url',
        video_url: { url },
        role: r.role || 'reference_video',
      });
    }
    for (const r of audios) {
      const url = await this.toAudioPayload(r.url);
      content.push({
        type: 'audio_url',
        audio_url: { url },
        role: r.role || 'reference_audio',
      });
    }

    const body: any = {
      model,
      content,
      generate_audio: input.generateAudio ?? true,
      ratio: input.ratio ?? '16:9',
      duration: normalizeSeedanceDuration(input.duration),
      watermark: input.watermark ?? false,
    };

    const res = await request(this.url(this.cfg.videoTasksPath), {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
      ...VolcengineArkProvider.SLOW_TIMEOUTS,
    });
    const text = await res.body.text();
    let parsed: any;
    try { parsed = JSON.parse(text); } catch {
      throw new Error(`Ark video submit non-JSON: ${text.slice(0, 200)}`);
    }
    if (res.statusCode >= 400) {
      const msg = parsed?.error?.message || text.slice(0, 200);
      throw new Error(humanizeArkVideoError(msg) || `Ark video submit failed (${res.statusCode}): ${msg}`);
    }
    // `id` / `task_id` are both observed in Ark APIs; support either.
    const taskId = parsed.id || parsed.task_id || parsed.data?.id || parsed.data?.task_id;
    if (!taskId) throw new Error(`Ark video submit missing task id: ${text.slice(0, 200)}`);
    return { taskId, status: 'queued', raw: parsed };
  }

  async pollVideoTask(taskId: string): Promise<VideoTaskResult> {
    // EXTENSION POINT: the official polling endpoint for Ark video tasks varies
    // across docs. The most commonly documented shape is:
    //   GET  {videoTasksPath}/{id}
    // If your deployment uses a different path (e.g. `/contents/generations/tasks/status`),
    // adjust this function. We keep it defensive: unknown statuses are reported as `running`.
    const url = this.url(`${this.cfg.videoTasksPath}/${taskId}`);
    const res = await request(url, {
      method: 'GET',
      headers: this.headers(),
      ...VolcengineArkProvider.FAST_TIMEOUTS,
    });
    const text = await res.body.text();
    if (res.statusCode >= 400) {
      // Treat 404 as "task probably finished on upstream and was cleaned up" only if we already got a result.
      this.logger.warn(`poll video task ${taskId} -> ${res.statusCode}: ${text.slice(0, 200)}`);
      return { taskId, status: 'running' };
    }
    let parsed: any;
    try { parsed = JSON.parse(text); } catch { return { taskId, status: 'running' }; }

    const status = normalizeTaskStatus(parsed.status || parsed.task_status || parsed.state || parsed.data?.status);
    const videoUrl = extractVideoUrl(parsed);
    const error = humanizeArkVideoError(
      parsed.error?.message
      || (typeof parsed.error === 'string' ? parsed.error : undefined)
      || parsed.message,
    );

    return {
      taskId,
      status,
      videoUrl,
      error: status === 'failed' ? error : undefined,
      raw: parsed,
    };
  }
}

/** Seedance 2.0 Mini 视频时长：官方支持 4–15 秒整数，默认 5 */
export function normalizeSeedanceDuration(seconds?: number): number {
  const d = seconds ?? 5;
  const rounded = Math.round(d);
  if (rounded >= 4 && rounded <= 15) return rounded;
  if (rounded < 4) return 5;
  return 15;
}

function extractVideoUrl(parsed: any): string | undefined {
  const direct = parsed.video_url
    || parsed.content?.video_url
    || parsed.data?.video_url
    || parsed.data?.content?.video_url
    || parsed.output?.video_url
    || parsed.result?.video_url
    || parsed.result_url;
  if (typeof direct === 'string') return direct;

  const listCandidates = [
    parsed.data?.videos,
    parsed.output?.videos,
    parsed.content?.video_urls,
    parsed.content,
  ];
  for (const list of listCandidates) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (typeof item === 'string') return item;
      if (typeof item?.url === 'string') return item.url;
      if (item?.type === 'video_url' && typeof item.video_url?.url === 'string') return item.video_url.url;
    }
  }
  return undefined;
}

function resolveArkImageSize(size?: string, seedream5 = false): string {
  if (!seedream5) {
    if (!size) return '1024x1024';
    if (/^\d+K$/i.test(size)) return '1024x1024';
    return size;
  }

  // Seedream 5 only accepts `2k`/`3k`/`4k` or explicit WxH (min ~3.6M px). UI `1K` → smallest valid 2K square.
  const toArk: Record<string, string> = {
    '1K': '2048x2048',
    '2K': '2K',
    '3K': '3K',
    '4K': '4K',
    '1024x1024': '2048x2048',
    '1280x720': '2560x1440',
    '1024x576': '2560x1440',
    '576x1024': '1728x2304',
  };
  const key = size?.trim();
  if (!key) return '2048x2048';
  if (toArk[key]) return toArk[key];
  if (/^\d+K$/i.test(key)) return toArk[key.toUpperCase()] || '2048x2048';
  return key;
}

function normalizeTaskStatus(s?: string): VideoTaskResult['status'] {
  if (!s) return 'running';
  const lower = String(s).toLowerCase();
  if (['success', 'succeeded', 'done', 'complete', 'completed', 'finished'].includes(lower)) return 'succeeded';
  if (['fail', 'failed', 'error', 'cancelled', 'canceled', 'expired'].includes(lower)) return 'failed';
  if (['queued', 'pending', 'waiting', 'created'].includes(lower)) return 'queued';
  return 'running';
}

function stripMarkdownFence(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/^```(?:html|ts|js|json|tsx)?\n([\s\S]*?)```$/);
  if (fenceMatch) return fenceMatch[1].trim();
  return trimmed;
}

function tryParseSlides(text: string): Array<{ title: string; body: string }> {
  try {
    const cleaned = stripMarkdownFence(text);
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((s) => s && typeof s.title === 'string')
        .map((s) => ({ title: String(s.title), body: String(s.body || '') }));
    }
  } catch {
    // fall through
  }
  // Fallback: split by blank lines -> slide fragments.
  const parts = text.split(/\n\s*\n/).filter(Boolean).slice(0, 8);
  return parts.map((p, i) => ({
    title: `第 ${i + 1} 页`,
    body: p.trim(),
  }));
}
