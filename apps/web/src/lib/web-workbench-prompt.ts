import { DECLARATIVE_AI_ITERATION_HINT, wantsAiFeatures } from '@ai-camp/types';
import { buildImageUploadCodeExample } from '@/lib/pm-app-ai-wiring';
import { WEB_ITERATION_DELTA_RULES } from '@/lib/web-iteration-prompt';
import { prepareIterationSourceForPrompt } from '@/lib/web-iteration-base';

export function buildWebWorkbenchIterationPrompt(
  html: string,
  instruction: string,
  blocksContext = '',
  pageTitle = '',
) {
  const blockSection = blocksContext
    ? `【重点修改区域】\n${blocksContext}\n\n`
    : '';
  const uploadHint = /上传|选图|图片上传|file/i.test(instruction)
    ? `\n【图片上传参考代码】\n${buildImageUploadCodeExample()}`
    : '';
  const source = prepareIterationSourceForPrompt(html);
  const aiHint = wantsAiFeatures(instruction)
    ? `\n${DECLARATIVE_AI_ITERATION_HINT}${uploadHint}\n禁止 mock；不要手写 __AI_CAMP__ 或把 JS 拼接写进 src/href。`
    : `\n若页面需要 AI 能力，请用 data-ai-action="text|image|video" 标记按钮，保留空的 data-ai-camp-runtime 占位。`;

  return `【上一版本完整 HTML 源码】${pageTitle ? `（${pageTitle}）` : ''}（业务页面，共约 ${source.length} 字符 — 必须作为唯一基础做增量修改）
${source}

${blockSection}【修改意见】
${instruction.trim()}
${aiHint}

要求：
${WEB_ITERATION_DELTA_RULES}
1. 输出完整单文件 HTML（含内联 CSS 和 JavaScript），只输出 HTML 代码。
2. 保留空的 <script data-ai-camp-runtime> 占位标签即可。
3. 儿童友好、可交互、移动端自适应。
4. 若需新增 AI 生图/生文：在现有「生成」按钮上加 data-ai-action，禁止 mock 假数据。`;
}
