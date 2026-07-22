/** Studio 对话改页共用：每次在上一次 HTML 基础上增量修改 */
export const WEB_ITERATION_DELTA_RULES = `【重要 · 在这一版的基础上修改】
- 下面「当前 HTML」是上一版本的完整业务源码（含内联 CSS/JS），你必须在此基础上做增量修改，禁止推倒重做、禁止输出空白页或全新无关页面。
- 保留用户未提及的所有内容、区块、文案、配色、布局与已有功能（含已有的 __AI_CAMP__ 调用）。
- 只改修改意见中明确要求的部分；若有「重点修改区域 / 点选部分」，优先改该区域及其直接相关的样式与结构。
- 输出必须是完整可运行的单文件 HTML，结构与上一版同等完整，不得省略大量原有代码。
- 只需保留空的 <script data-ai-camp-runtime> 占位标签，不要自己编写或复制运行时脚本正文（平台会自动注入）。`;

export const WEB_ITERATION_UI_HINT =
  '每次「应用修改」都会在你当前预览的这一版上继续改，不会从头重来。想改某一块？切到「点选加入」点一下再加说明。加 AI 功能请说「生图/生文」；改不好可点「导出 HTML」用其他工具继续改。';

export const WEB_ITERATION_PLACEHOLDER = '在现有版本基础上，描述你想怎么改…';

/** 快捷想法前缀，避免 AI 误当成从零生成 */
export function prefixIterationWish(wish: string): string {
  const w = wish.trim();
  if (!w) return w;
  if (/在现有版本|在这一版|在这个版本|基础上/.test(w)) return w;
  return `在现有版本基础上，${w}`;
}
