import { escapeHtml } from './html-utils';

export interface CourseHomeData {
  title: string;
  intro: string | null;
  ownerName: string;
  featuredHtml: string | null;
  assets: Array<{ title: string; type: string; url: string | null; thumbnailUrl: string | null }>;
  webProjects: Array<{ title: string; slug: string }>;
}

export interface GrowthRecordItem {
  kind: string;
  gameSlug: string;
  title: string;
  summary: string | null;
  mediaUrl: string | null;
  createdAt: Date;
}

export interface GrowthData {
  ownerName: string;
  assets: number;
  jobs: number;
  submissions: Array<{ taskTitle: string; status: string; createdAt: Date }>;
  recent: Array<{ title: string; type: string; url: string | null; createdAt: Date }>;
  /** 成长手册：课堂问答 / 游戏记录 / 分享等 */
  records?: GrowthRecordItem[];
}

const GROWTH_KIND_META: Record<string, { emoji: string; label: string; color: string }> = {
  quiz: { emoji: '📝', label: '课堂问答', color: '#0ea5e9' },
  game: { emoji: '🎮', label: '游戏记录', color: '#8b5cf6' },
  debate: { emoji: '⚖️', label: '思辨观点', color: '#f59e0b' },
  share: { emoji: '🎤', label: '我的分享', color: '#ec4899' },
  creation: { emoji: '🎨', label: '课堂创作', color: '#10b981' },
};

function fmtDate(d: Date): string {
  const dt = new Date(d);
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  const hh = String(dt.getHours()).padStart(2, '0');
  const mi = String(dt.getMinutes()).padStart(2, '0');
  return `${mm}-${dd} ${hh}:${mi}`;
}

export function renderCourseHomePage(data: CourseHomeData): string {
  if (data.featuredHtml) {
    return data.featuredHtml;
  }
  const assetCards = data.assets
    .slice(0, 12)
    .map((a) => {
      const thumb = a.thumbnailUrl || a.url;
      const inner = thumb && (a.type === 'image' || a.type === 'poster')
        ? `<img src="${escapeAttr(thumb)}" alt="" style="width:100%;height:100%;object-fit:cover">`
        : `<span style="font-size:12px;color:#64748b;padding:8px;text-align:center">${escapeHtml(a.title)}</span>`;
      return `<div style="aspect-ratio:1;background:#fff7ed;border-radius:16px;overflow:hidden;border:2px solid #fed7aa;display:flex;align-items:center;justify-content:center">${inner}</div>`;
    })
    .join('');
  const webLinks = data.webProjects
    .map((p) => `<a href="/p/${escapeAttr(p.slug)}" style="display:block;padding:12px 16px;background:#fff;border-radius:12px;border:2px solid #e2e8f0;color:#0ea5e9;font-weight:700;text-decoration:none;margin-bottom:8px">${escapeHtml(p.title)} →</a>`)
    .join('');

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(data.title)} · AI Camp</title>
<style>
  body { font-family: 'PingFang SC', system-ui, sans-serif; margin: 0; background: linear-gradient(135deg,#fff7ed,#fce7f3,#e0f2fe); color: #1e293b; }
  .wrap { max-width: 880px; margin: 0 auto; padding: 32px 20px 64px; }
  h1 { font-size: clamp(1.6rem,4vw,2.2rem); color: #c2410c; margin: 0 0 8px; }
  .intro { color: #475569; line-height: 1.7; margin-bottom: 28px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(120px,1fr)); gap: 12px; }
  h2 { font-size: 1.1rem; margin: 28px 0 12px; color: #334155; }
  .footer { position: fixed; bottom: 8px; right: 8px; font-size: 12px; background: rgba(255,255,255,.9); padding: 6px 10px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
</style>
</head>
<body>
<div class="wrap">
  <h1>${escapeHtml(data.title)}</h1>
  <p class="intro">${escapeHtml(data.intro || `${data.ownerName} 在 AI 训练营的课程作品主页`)}</p>
  <h2>🖼️ 我的作品</h2>
  <div class="grid">${assetCards || '<p style="color:#94a3b8">还没有作品，继续加油！</p>'}</div>
  ${webLinks ? `<h2>🌐 我的网页</h2>${webLinks}` : ''}
</div>
<div class="footer">${escapeHtml(data.ownerName)} · <a href="/" style="color:#0ea5e9">AI Camp</a></div>
</body></html>`;
}

export function renderGrowthPage(data: GrowthData): string {
  const recentCards = data.recent
    .map((a) => {
      const inner = a.url && (a.type === 'image' || a.type === 'poster')
        ? `<img src="${escapeAttr(a.url)}" alt="" style="width:100%;height:100%;object-fit:cover">`
        : `<span style="font-size:11px;padding:6px;text-align:center;color:#64748b">${escapeHtml(a.title)}</span>`;
      return `<div style="aspect-ratio:1;background:#fff;border-radius:12px;overflow:hidden;border:2px solid #e2e8f0">${inner}</div>`;
    })
    .join('');
  const timeline = data.submissions
    .slice(0, 15)
    .map((s) => `<li style="padding:10px 0;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;gap:12px"><span>${escapeHtml(s.taskTitle)}</span><span style="color:#94a3b8;font-size:12px;white-space:nowrap">${escapeHtml(s.status)}</span></li>`)
    .join('');

  const records = data.records || [];
  const bookCards = records
    .map((r) => {
      const meta = GROWTH_KIND_META[r.kind] || { emoji: '⭐', label: '记录', color: '#64748b' };
      const media = r.mediaUrl
        ? /\.(mp4|webm|mov)(\?|$)/i.test(r.mediaUrl)
          ? `<video src="${escapeAttr(r.mediaUrl)}" controls playsinline style="width:100%;max-height:220px;border-radius:10px;background:#000;margin-top:8px"></video>`
          : `<img src="${escapeAttr(r.mediaUrl)}" alt="" style="width:100%;max-height:220px;object-fit:cover;border-radius:10px;margin-top:8px">`
        : '';
      return `<div class="rec">
  <div class="rec-head">
    <span class="rec-tag" style="background:${meta.color}18;color:${meta.color}">${meta.emoji} ${escapeHtml(meta.label)}</span>
    <span class="rec-time">${fmtDate(r.createdAt)}</span>
  </div>
  <div class="rec-title">${escapeHtml(r.title)}</div>
  ${r.summary ? `<div class="rec-summary">${escapeHtml(r.summary).replace(/\n/g, '<br>')}</div>` : ''}
  ${media}
</div>`;
    })
    .join('');

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(data.ownerName)} 的成长历程 · AI Camp</title>
<style>
  body { font-family: 'PingFang SC', system-ui, sans-serif; margin: 0; background: linear-gradient(180deg,#ecfdf5,#f0f9ff); color: #1e293b; }
  .wrap { max-width: 880px; margin: 0 auto; padding: 32px 20px 64px; }
  h1 { font-size: clamp(1.5rem,4vw,2rem); color: #047857; margin: 0 0 24px; }
  .stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-bottom: 28px; }
  .stat { background: #fff; border-radius: 16px; padding: 16px; text-align: center; box-shadow: 0 4px 16px rgba(0,0,0,.06); }
  .stat b { display: block; font-size: 1.8rem; color: #0d9488; }
  .stat span { font-size: 12px; color: #64748b; }
  h2 { font-size: 1.05rem; margin: 24px 0 12px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(100px,1fr)); gap: 10px; }
  ul { list-style: none; padding: 0; margin: 0; background: #fff; border-radius: 16px; padding: 8px 16px; box-shadow: 0 4px 16px rgba(0,0,0,.05); }
  .footer { position: fixed; bottom: 8px; right: 8px; font-size: 12px; background: rgba(255,255,255,.9); padding: 6px 10px; border-radius: 8px; }
  .book { display: grid; gap: 12px; }
  .rec { background: #fff; border-radius: 16px; padding: 14px 16px; box-shadow: 0 4px 16px rgba(0,0,0,.05); }
  .rec-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .rec-tag { font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 999px; }
  .rec-time { font-size: 12px; color: #94a3b8; }
  .rec-title { font-weight: 700; margin-top: 8px; }
  .rec-summary { font-size: 13px; color: #475569; line-height: 1.7; margin-top: 6px; white-space: pre-wrap; }
</style>
</head>
<body>
<div class="wrap">
  <h1>📈 ${escapeHtml(data.ownerName)} 的成长手册</h1>
  <div class="stats">
    <div class="stat"><b>${data.assets}</b><span>作品总数</span></div>
    <div class="stat"><b>${data.jobs}</b><span>AI 创作次数</span></div>
    <div class="stat"><b>${records.length}</b><span>课堂记录</span></div>
  </div>
  ${bookCards ? `<h2>📖 课堂足迹（问答 · 游戏 · 分享）</h2><div class="book">${bookCards}</div>` : ''}
  <h2>🎨 最近作品</h2>
  <div class="grid">${recentCards || '<p style="color:#94a3b8">还没有作品</p>'}</div>
  ${timeline ? `<h2>📋 任务记录</h2><ul>${timeline}</ul>` : ''}
</div>
<div class="footer"><a href="/" style="color:#0ea5e9;text-decoration:none">AI Camp</a></div>
</body></html>`;
}

function escapeAttr(s: string) {
  return escapeHtml(s).replace(/"/g, '&quot;');
}
