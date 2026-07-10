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

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Local SVG placeholder — avoids external picsum.photos (often blocked / 521 in China). */
function mockSvgDataUrl(label: string, hue: number): string {
  const safe = label.replace(/[<>&"']/g, '').slice(0, 48);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="768" height="512" viewBox="0 0 768 512">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0%" stop-color="hsl(${hue},85%,75%)"/><stop offset="100%" stop-color="hsl(${hue + 40},80%,65%)"/>
</linearGradient></defs>
<rect width="768" height="512" fill="url(#g)"/>
<text x="384" y="230" text-anchor="middle" font-family="system-ui,sans-serif" font-size="26" fill="white" font-weight="bold">AI Camp 演示图</text>
<text x="384" y="280" text-anchor="middle" font-family="system-ui,sans-serif" font-size="15" fill="rgba(255,255,255,0.92)">${safe}</text>
<text x="384" y="310" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" fill="rgba(255,255,255,0.75)">配置真实模型后可生成真实图片</text>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

/**
 * Deterministic, zero-key provider used when no real provider is configured
 * or when the admin explicitly keeps the system in "safe demo" mode.
 * It must be able to keep the full UX running end-to-end.
 */
export class MockProvider implements AiProviderAdapter {
  readonly name = 'mock';
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

  // Simulated video tasks live in-memory. In a real deployment BullMQ + the
  // real provider handle state; for mock this is enough to keep the UX real.
  private readonly videoTasks = new Map<string, { createdAt: number; prompt: string }>();

  async generateText(input: BaseGenerateInput): Promise<TextResult> {
    await delay(400);
    const raw = input.prompt;
    if (typeof input.options?.system === 'string' && input.options.system.includes('提示词优化')) {
      const idea = raw.replace(/用户原始想法：\s*/s, '').split('请输出')[0]?.trim() || raw;
      const short = idea.slice(0, 60).replace(/\s+/g, ' ');
      return {
        text: `${short}，明亮色彩，儿童插画风格，细节清晰，画面温馨`,
      };
    }
    return {
      text: `【演示】关于「${input.prompt}」的示例文本：\n\n这是一段 MockProvider 生成的占位内容，用于打通系统链路。\n请在管理员后台配置真实 VolcengineArkProvider 之后体验真实 AI 输出。`,
    };
  }

  async generateImage(input: BaseGenerateInput): Promise<ImageResult> {
    await delay(400);
    const label = input.prompt?.trim() || 'AI 画图';
    return {
      imageUrls: [
        mockSvgDataUrl(label, 24),
        mockSvgDataUrl(label, 200),
      ],
    };
  }

  async generateWebPage(input: BaseGenerateInput): Promise<WebPageResult> {
    await delay(500);
    const title = input.prompt.slice(0, 32) || 'AI 生成网页';
    const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${title}</title><style>
body{margin:0;font-family:system-ui;background:linear-gradient(135deg,#fef3c7,#bae6fd);min-height:100vh;display:flex;align-items:center;justify-content:center;}
main{background:white;padding:48px;border-radius:24px;max-width:640px;box-shadow:0 16px 48px rgba(0,0,0,0.08);text-align:center;}
h1{font-size:32px;color:#ea580c;margin:0 0 16px;}
p{color:#374151;line-height:1.7;}
.button{display:inline-block;margin-top:16px;padding:12px 24px;background:#f97316;color:white;border-radius:999px;text-decoration:none;font-weight:600;}
</style></head>
<body><main>
<h1>🎉 ${title}</h1>
<p>这是 MockProvider 生成的演示网页。把你想要的网页描述输入左侧，我会根据你的提示词重新生成内容。</p>
<p><em>提示：接入真实 Volcengine Ark 后，AI 会根据你的想法生成真正的网页。</em></p>
<a class="button" href="#">示例按钮</a>
</main></body></html>`;
    return { html };
  }

  async generatePoster(input: BaseGenerateInput): Promise<PosterResult> {
    await delay(400);
    const label = input.prompt?.trim() || 'AI 海报';
    return { imageUrl: mockSvgDataUrl(label, 280) };
  }

  async generatePpt(input: BaseGenerateInput): Promise<PptResult> {
    await delay(400);
    const topic = input.prompt || '示例主题';
    return {
      slides: [
        { title: `封面：${topic}`, body: `关于「${topic}」的 AI 学习 PPT 演示` },
        { title: '背景介绍', body: '介绍一下这个主题的基本背景知识。' },
        { title: '关键要点', body: '要点一 / 要点二 / 要点三' },
        { title: '我的思考', body: '我从这个主题里学到了什么？' },
        { title: '结语', body: '谢谢观看！' },
      ],
    };
  }

  async generateMixedContent(input: BaseGenerateInput): Promise<MixedContentResult> {
    await delay(400);
    const hasImage = input.references?.some((r) => r.type === 'image');
    return {
      text: hasImage
        ? `我在参考图里看到了关于「${input.prompt}」的画面。这是 MockProvider 模拟的图文理解回答。`
        : `关于「${input.prompt}」的图文回答（示例）。`,
    };
  }

  async generateCode(input: BaseGenerateInput): Promise<TextResult> {
    await delay(400);
    return {
      text: `// 示例代码：${input.prompt}\nfunction hello() {\n  console.log('Hello from MockProvider');\n}\n`,
    };
  }

  async submitVideoTask(input: VideoSubmitInput): Promise<VideoTaskResult> {
    const taskId = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.videoTasks.set(taskId, { createdAt: Date.now(), prompt: input.prompt });
    return { taskId, status: 'queued' };
  }

  async pollVideoTask(taskId: string): Promise<VideoTaskResult> {
    const t = this.videoTasks.get(taskId);
    if (!t) return { taskId, status: 'failed', error: 'task not found' };
    const elapsed = Date.now() - t.createdAt;
    if (elapsed < 4_000) return { taskId, status: 'queued' };
    if (elapsed < 8_000) return { taskId, status: 'running' };
    // Return a publicly available sample video so playback works without keys.
    return {
      taskId,
      status: 'succeeded',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    };
  }
}
