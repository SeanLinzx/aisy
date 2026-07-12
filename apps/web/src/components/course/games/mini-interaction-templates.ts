/** 无交互的基础页面模板 —— 学生先预览，再通过填空让 AI 逐条加入可叠加的交互。 */

export const TRIGGER_OPTIONS = ['单击', '双击', '右键点击', '拖拽'] as const;
export type TriggerOption = (typeof TRIGGER_OPTIONS)[number];

export interface InteractionLayerSpec {
  target: string;
  trigger: TriggerOption;
  result: string;
}

export interface InteractionTemplate {
  id: string;
  title: string;
  emoji: string;
  desc: string;
  html: string;
  /** 当前页面上可被选为交互对象的区域（下拉填空，不可自由输入） */
  clickTargets: string[];
  /** 「会出现什么」的快捷选项 */
  resultOptions: string[];
  /** 默认第一条交互建议 */
  defaults: InteractionLayerSpec;
}

export const INTERACTION_TEMPLATES: InteractionTemplate[] = [
  {
    id: 'cat',
    title: '我的小猫',
    emoji: '🐱',
    desc: '一只坐在草地上的小猫，还没有任何反应。',
    clickTargets: ['小猫 🐱', '小草 🌿🌿🌿', '页面标题「我的小猫朋友」'],
    resultOptions: [
      '小猫会跳起来并发出喵喵声，旁边弹出爱心',
      '小草会轻轻摇摆，出现小蝴蝶',
      '标题会变成彩虹色并闪一下',
    ],
    defaults: {
      target: '小猫 🐱',
      trigger: '单击',
      result: '小猫会跳起来并发出喵喵声，旁边弹出爱心',
    },
    html: `<!doctype html><html lang="zh"><head><meta charset="utf-8"><style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;font-family:system-ui,sans-serif;background:linear-gradient(180deg,#7dd3fc,#bae6fd 40%,#86efac);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px}
h1{margin:0 0 8px;color:#fff;font-size:28px;text-shadow:0 2px 8px rgba(0,0,0,.15);cursor:default}
.sub{margin:0 0 24px;color:#0f766e;font-size:14px;font-weight:600;background:rgba(255,255,255,.7);padding:6px 14px;border-radius:999px}
.stage{background:rgba(255,255,255,.55);border-radius:32px;padding:32px 48px;box-shadow:0 8px 32px rgba(0,0,0,.08);text-align:center}
.cat{font-size:120px;line-height:1;display:block;margin:0;cursor:pointer;user-select:none}
.grass{font-size:40px;margin-top:8px;cursor:pointer;user-select:none}
.badge{margin-top:20px;font-size:12px;color:#64748b;background:#fff;padding:8px 12px;border-radius:12px;display:inline-block}
</style></head><body>
<h1 id="page-title">我的小猫朋友</h1>
<p class="sub">这是一张「还没有交互」的页面</p>
<div class="stage">
  <span class="cat" id="target-cat" data-target="小猫">🐱</span>
  <div class="grass" id="target-grass" data-target="小草">🌿🌿🌿</div>
  <div class="badge">现在点它什么都不会发生哦</div>
</div>
</body></html>`,
  },
  {
    id: 'stars',
    title: '数星星',
    emoji: '⭐',
    desc: '夜空里有很多星星，静静闪着光。',
    clickTargets: ['任意一颗星星 ⭐', '月亮 🌙', '页面标题「晚安，数星星」'],
    resultOptions: [
      '被点的星星会变大发光，并显示一句鼓励的话',
      '月亮会轻轻摇晃，洒下更多小星星',
      '标题会变成闪烁的金色',
    ],
    defaults: {
      target: '任意一颗星星 ⭐',
      trigger: '单击',
      result: '被点的星星会变大发光，并显示一句鼓励的话',
    },
    html: `<!doctype html><html lang="zh"><head><meta charset="utf-8"><style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;font-family:system-ui,sans-serif;background:linear-gradient(180deg,#1e1b4b,#312e81 50%,#4338ca);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;color:#fff}
h1{margin:0 0 8px;font-size:26px;cursor:pointer}
.sub{margin:0 0 24px;font-size:13px;opacity:.85}
.sky{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;background:rgba(255,255,255,.08);padding:28px;border-radius:24px}
.star{font-size:36px;text-align:center;line-height:1.2;cursor:pointer;user-select:none}
.moon{font-size:48px;grid-column:span 4;text-align:center;margin-bottom:8px;cursor:pointer;user-select:none}
.badge{margin-top:20px;font-size:12px;opacity:.7;background:rgba(0,0,0,.2);padding:8px 14px;border-radius:999px}
</style></head><body>
<h1 id="target-title">🌙 晚安，数星星</h1>
<p class="sub">星星在闪，但还不能点击</p>
<div class="sky">
  <div class="moon" id="target-moon">🌙</div>
  <span class="star" data-target="star">⭐</span><span class="star" data-target="star">✨</span><span class="star" data-target="star">⭐</span><span class="star" data-target="star">✨</span>
  <span class="star" data-target="star">✨</span><span class="star" data-target="star">⭐</span><span class="star" data-target="star">✨</span><span class="star" data-target="star">⭐</span>
</div>
<div class="badge">试着描述：点星星会发生什么？</div>
</body></html>`,
  },
  {
    id: 'plant',
    title: '小盆栽',
    emoji: '🪴',
    desc: '一盆有点蔫的小植物，等待你的照顾。',
    clickTargets: ['浇水按钮 💧', '小盆栽 🪴', '页面标题「我的小小花园」'],
    resultOptions: [
      '植物会变大变绿，冒出小水滴动画，显示「谢谢你！」',
      '按钮会变成蓝色并显示「已浇水」',
      '标题旁边会开出一朵小花',
    ],
    defaults: {
      target: '浇水按钮 💧',
      trigger: '单击',
      result: '植物会变大变绿，冒出小水滴动画，显示「谢谢你！」',
    },
    html: `<!doctype html><html lang="zh"><head><meta charset="utf-8"><style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;font-family:system-ui,sans-serif;background:linear-gradient(180deg,#ecfccb,#d9f99d);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px}
h1{margin:0 0 8px;color:#365314;font-size:26px;cursor:pointer}
.sub{margin:0 0 20px;color:#4d7c0f;font-size:13px}
.pot{background:#fff;border-radius:28px;padding:28px 36px;text-align:center;box-shadow:0 8px 24px rgba(101,163,13,.2);min-width:260px}
.plant{font-size:80px;line-height:1;margin:8px 0;cursor:pointer;user-select:none}
.btn{display:inline-block;margin-top:12px;padding:12px 24px;border-radius:14px;background:#84cc16;color:#fff;font-weight:700;font-size:15px;border:none;cursor:pointer;user-select:none}
.badge{margin-top:16px;font-size:12px;color:#65a30d}
</style></head><body>
<h1 id="target-title">我的小小花园</h1>
<p class="sub">静态页面 · 还没有交互</p>
<div class="pot">
  <div class="plant" id="target-plant">🪴</div>
  <div style="color:#713f12;font-size:14px">有点渴了…</div>
  <button type="button" class="btn" id="target-water-btn">💧 浇水</button>
  <div class="badge">按钮暂时不会动</div>
</div>
</body></html>`,
  },
  {
    id: 'score',
    title: '星际跑酷',
    emoji: '🚀',
    desc: '飞船在赛道上前进，用左右按钮躲避陨石——但还不会产生任何反应。',
    clickTargets: ['向左按钮 ⬅️', '向右按钮 ➡️', '飞船 🚀', '陨石 ☄️', '分数数字'],
    resultOptions: [
      '飞船向左移动，躲开陨石，分数 +10 并闪绿光',
      '飞船向右移动，躲开陨石，弹出「好险！」',
      '陨石被躲开时碎裂消失，分数数字弹跳变大',
      '分数数字旁边冒出「+1」小动画',
    ],
    defaults: {
      target: '向左按钮 ⬅️',
      trigger: '单击',
      result: '飞船向左移动，躲开陨石，分数 +10 并闪绿光',
    },
    html: `<!doctype html><html lang="zh"><head><meta charset="utf-8"><style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;font-family:system-ui,sans-serif;background:linear-gradient(180deg,#0f172a,#1e1b4b 50%,#312e81);display:flex;align-items:center;justify-content:center;padding:20px;color:#fff}
.card{background:rgba(30,27,75,.92);border-radius:24px;padding:22px 24px;border:2px solid rgba(255,255,255,.12);text-align:center;min-width:280px;max-width:320px;box-shadow:0 12px 40px rgba(0,0,0,.35)}
h1{margin:0 0 6px;font-size:22px;color:#fde68a;cursor:pointer}
.note{margin:0 0 14px;font-size:12px;color:#a5b4fc}
.score{font-size:40px;font-weight:800;color:#fbbf24;margin:0;line-height:1;cursor:pointer;user-select:none}
.score-label{font-size:12px;color:#94a3b8;margin-bottom:12px}
.track{position:relative;height:96px;background:linear-gradient(180deg,rgba(99,102,241,.2),rgba(15,23,42,.6));border-radius:16px;margin:10px 0 16px;border:1px dashed rgba(255,255,255,.2);overflow:hidden}
.ship{font-size:44px;position:absolute;bottom:20px;left:42%;cursor:pointer;user-select:none;line-height:1}
.meteor{font-size:30px;position:absolute;bottom:18px;right:16%;cursor:pointer;user-select:none}
.lane{position:absolute;bottom:10px;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,#818cf8,transparent);opacity:.45}
.btns{display:flex;gap:10px;justify-content:center}
.btn{flex:1;padding:14px 0;border-radius:14px;font-size:22px;font-weight:700;border:none;cursor:pointer;user-select:none;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;box-shadow:0 4px 12px rgba(99,102,241,.35)}
.btn-right{background:linear-gradient(135deg,#8b5cf6,#7c3aed)}
.badge{margin-top:14px;font-size:11px;color:#94a3b8;background:rgba(0,0,0,.25);padding:8px 12px;border-radius:12px;display:inline-block}
</style></head><body>
<div class="card">
  <h1 id="target-title">🚀 星际跑酷</h1>
  <p class="note">左右按钮躲避陨石，但还没有任何交互</p>
  <div class="score" id="target-score">0</div>
  <div class="score-label">分</div>
  <div class="track">
    <span class="ship" id="target-ship">🚀</span>
    <span class="meteor" id="target-meteor">☄️</span>
    <div class="lane"></div>
  </div>
  <div class="btns">
    <button type="button" class="btn" id="target-left-btn">⬅️</button>
    <button type="button" class="btn btn-right" id="target-right-btn">➡️</button>
  </div>
  <div class="badge">点左右按钮、飞船、陨石都还没有反应哦</div>
</div>
</body></html>`,
  },
];

export function interactionRuleSentence(layer: InteractionLayerSpec): string {
  return `当我对页面上的「${layer.target}」进行「${layer.trigger}」时，页面会「${layer.result}」。`;
}

export function buildInteractionPrompt(params: {
  template: InteractionTemplate;
  baseHtml: string;
  newLayer: InteractionLayerSpec;
  existingLayers: InteractionLayerSpec[];
}): string {
  const { template, baseHtml, newLayer, existingLayers } = params;
  const triggerHint =
    newLayer.trigger === '拖拽'
      ? '实现 drag 或 touch 拖拽交互'
      : newLayer.trigger === '双击'
        ? '监听 dblclick 事件'
        : newLayer.trigger === '右键点击'
          ? '监听 contextmenu 事件（可 preventDefault 后显示自定义效果）'
          : '监听 click 事件';

  const existingBlock =
    existingLayers.length > 0
      ? `【已有交互（必须全部保留且继续可用，不要删改）】
${existingLayers.map((l, i) => `${i + 1}. ${interactionRuleSentence(l)}`).join('\n')}

`
      : '';

  const baseLabel =
    existingLayers.length > 0
      ? '【当前页面 HTML（已含上述交互，请在其基础上叠加）】'
      : '【现有页面 HTML（目前没有任何交互）】';

  return `${existingBlock}${baseLabel}
${baseHtml}

【本次要${existingLayers.length > 0 ? '再增加' : '加入'}的交互】
- 操作对象（必须是页面上真实存在的可点击/可拖拽区域）：${newLayer.target}
- 触发方式：${newLayer.trigger}（${triggerHint}）
- 出现的效果：${newLayer.result}

要求：
1. ${existingLayers.length > 0 ? '保留所有已有交互逻辑，新交互与之叠加、互不冲突。' : '在这个页面的基础上加入 JavaScript 交互，不要完全重写视觉设计。'}
2. 尽量保留原有布局、配色和主要元素，主题仍是「${template.title}」。
3. 交互对象尽量对应页面里真实的元素（如 #target-cat、.star、按钮等）；如果「操作对象」是小朋友自己新增的描述、页面上确实没有对应元素，就在页面上补充一个能匹配这个描述的新元素，并让它可以正确触发交互。
4. ${newLayer.trigger} 必须能真实触发。
5. 输出完整的单文件 HTML（含内联 CSS 和 JavaScript），可直接运行。
6. 交互必须能真实运行，色彩活泼、适合儿童；不要使用外部网络资源。
7. 只输出 HTML 代码本身，不要 Markdown 代码块。`;
}
