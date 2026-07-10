export interface CreationSessionPayload {
  title: string;
  kind: 'image' | 'video';
  rawPrompt: string;
  optimizedPrompt: string;
  imageUrls?: string[];
  videoUrl?: string;
}

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildCreationSessionHtml(p: CreationSessionPayload): string {
  const images =
    p.imageUrls?.length
      ? `<div class="grid">${p.imageUrls
          .map(
            (u) =>
              `<figure><img src="${esc(u)}" alt="作品"/><figcaption>AI 生成图片</figcaption></figure>`,
          )
          .join('')}</div>`
      : '';

  const video = p.videoUrl
    ? `<div class="video-wrap"><video controls playsinline src="${esc(p.videoUrl)}"></video></div>`
    : '';

  const badge = p.kind === 'image' ? '🎨 自由生图' : '🎬 自由生视频';

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(p.title)}</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:linear-gradient(135deg,#fff7ed,#fce7f3 40%,#e0f2fe);min-height:100vh;padding:24px;color:#334155}
  main{max-width:720px;margin:0 auto}
  .badge{display:inline-block;background:#fff;padding:6px 14px;border-radius:999px;font-size:13px;font-weight:700;color:#ea580c;box-shadow:0 4px 12px rgba(0,0,0,.06)}
  h1{margin:12px 0 4px;font-size:1.75rem;color:#c2410c}
  .card{background:#fff;border-radius:20px;padding:20px;margin:16px 0;box-shadow:0 8px 24px rgba(0,0,0,.06)}
  .card h2{margin:0 0 10px;font-size:1rem;color:#64748b}
  .prompt{white-space:pre-wrap;line-height:1.65;font-size:15px}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-top:8px}
  figure{margin:0;background:#fff7ed;border-radius:16px;overflow:hidden}
  figure img{width:100%;display:block;aspect-ratio:1;object-fit:cover}
  figcaption{padding:8px;font-size:12px;text-align:center;color:#64748b}
  .video-wrap video{width:100%;border-radius:16px;background:#000;margin-top:8px}
  footer{text-align:center;font-size:12px;color:#94a3b8;margin-top:24px}
</style>
</head>
<body>
<main>
  <span class="badge">${badge}</span>
  <h1>${esc(p.title)}</h1>
  <div class="card">
    <h2>💭 我最初的想法</h2>
    <p class="prompt">${esc(p.rawPrompt)}</p>
  </div>
  <div class="card">
    <h2>✨ AI 优化后的提示词</h2>
    <p class="prompt">${esc(p.optimizedPrompt)}</p>
  </div>
  <div class="card">
    <h2>${p.kind === 'image' ? '🖼️ 生成作品' : '🎬 生成视频'}</h2>
    ${images}${video || '<p style="color:#94a3b8">（作品生成后将显示在这里）</p>'}
  </div>
  <footer>由 AI Camp 自由创作工具生成</footer>
</main>
</body>
</html>`;
}
