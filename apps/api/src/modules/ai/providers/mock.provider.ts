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
    const system = typeof input.options?.system === 'string' ? input.options.system : '';
    const history = input.options?.messages as Array<{ role: string; content: string }> | undefined;
    if (system.includes('产品经理') || system.includes('需求说明书')) {
      const prdJson = JSON.stringify(
        {
          productName: '兴趣小助手',
          tagline: `帮喜欢「${raw.slice(0, 12)}」的小朋友发现更多乐趣`,
          targetUsers: '和我同龄的小朋友',
          problem: '平时想记录和分享兴趣，但缺少一个好用的工具',
          features: ['记录兴趣点滴', '生成趣味小知识', '分享给好朋友'],
          scenario: '课余时间打开小应用，记录今天的新发现',
        },
        null,
        2,
      );
      return {
        text: `太棒了！你对「${raw.slice(0, 20)}」很有热情呢。我想再问问：你希望这个产品是给自己用，还是也给同学用？\n\n\`\`\`json\n${prdJson}\n\`\`\``,
      };
    }
    if (history?.length) {
      return {
        text: `【演示】收到你的回复：「${raw.slice(0, 40)}」。这是 Mock 多轮对话占位回复，配置真实模型后可体验完整对话。`,
      };
    }
    if (system.includes('提示词优化')) {
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
    const aiCamp = Boolean(input.options?.aiCamp);
    if (aiCamp) {
      const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${title}</title><style>
body{margin:0;font-family:system-ui;background:linear-gradient(135deg,#fef3c7,#bae6fd);min-height:100vh;padding:24px;}
main{background:white;padding:32px;border-radius:24px;max-width:640px;margin:0 auto;box-shadow:0 16px 48px rgba(0,0,0,0.08);}
h1{font-size:28px;color:#ea580c;margin:0 0 16px;text-align:center;}
input,textarea{width:100%;padding:12px;border:2px solid #fed7aa;border-radius:12px;font-size:16px;box-sizing:border-box;}
button{margin-top:12px;width:100%;padding:14px;background:#f97316;color:white;border:none;border-radius:999px;font-size:18px;font-weight:700;cursor:pointer;}
#aiOutput{margin-top:16px;padding:16px;background:#fff7ed;border-radius:12px;min-height:80px;white-space:pre-wrap;line-height:1.6;}
#aiLoading{display:none;text-align:center;color:#ea580c;font-weight:700;}
</style></head><body><main>
<h1>🪄 ${title}</h1>
<input id="userInput" placeholder="在这里输入…" />
<button id="generateBtn">✨ AI 生成</button>
<div id="aiLoading">AI 正在思考…</div>
<div id="aiOutput">输入内容后点击生成</div>
<script>
document.getElementById('generateBtn').addEventListener('click', async function(){
  var inputEl=document.getElementById('userInput');
  var outputEl=document.getElementById('aiOutput');
  var loadingEl=document.getElementById('aiLoading');
  var val=(inputEl.value||'').trim();
  if(!val){alert('请先输入');return;}
  loadingEl.style.display='block';
  outputEl.textContent='AI 正在思考…';
  try{
    var text=await __AI_CAMP__.text(val,'你是友好的儿童 AI 助手');
    outputEl.textContent=text;
  }catch(e){outputEl.textContent='失败：'+(e.message||'请重试');}
  finally{loadingEl.style.display='none';}
});
<\/script></main></body></html>`;
      return { html };
    }
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
