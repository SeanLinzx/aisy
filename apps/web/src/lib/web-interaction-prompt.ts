import {
  interactionRuleSentence,
  type InteractionLayerSpec,
  type TriggerOption,
} from '@/components/course/games/mini-interaction-templates';

export {
  TRIGGER_OPTIONS,
  interactionRuleSentence,
  type InteractionLayerSpec,
  type TriggerOption,
} from '@/components/course/games/mini-interaction-templates';

export const WEB_RESULT_HINTS = [
  '元素会轻轻放大并出现阴影，显示一段有趣的文字',
  '点击后弹出提示框，说一句鼓励的话',
  '颜色渐变闪一下，并播放简单的动画效果',
  '图片会翻转，背面显示隐藏的小秘密',
  '标题会变色并跳动一下，吸引注意力',
  '点击后播放「叮」的提示感，并显示 +1',
];

function triggerHint(trigger: TriggerOption): string {
  if (trigger === '拖拽') return '实现 drag 或 touch 拖拽交互';
  if (trigger === '双击') return '监听 dblclick 事件';
  if (trigger === '右键点击') return '监听 contextmenu 事件（可 preventDefault 后显示自定义效果）';
  return '监听 click 事件';
}

/** 探索模式 · 网页工作台：在已有页面上叠加交互 */
export function buildWebWorkbenchInteractionPrompt(params: {
  pageTitle?: string;
  baseHtml: string;
  newLayer: InteractionLayerSpec;
  existingLayers: InteractionLayerSpec[];
}): string {
  const { pageTitle, baseHtml, newLayer, existingLayers } = params;
  const theme = pageTitle?.trim() || '我的网页';

  const existingBlock =
    existingLayers.length > 0
      ? `【已有交互（必须全部保留且继续可用，不要删改）】
${existingLayers.map((l, i) => `${i + 1}. ${interactionRuleSentence(l)}`).join('\n')}

`
      : '';

  const baseLabel =
    existingLayers.length > 0
      ? '【当前页面 HTML（已含上述交互，请在其基础上叠加）】'
      : '【现有页面 HTML（目前可能还没有交互脚本）】';

  return `${existingBlock}${baseLabel}
${baseHtml}

【本次要${existingLayers.length > 0 ? '再增加' : '加入'}的交互】
- 操作对象（尽量对应页面上真实存在的元素）：${newLayer.target}
- 触发方式：${newLayer.trigger}（${triggerHint(newLayer.trigger)}）
- 出现的效果：${newLayer.result}

要求：
1. ${existingLayers.length > 0 ? '保留所有已有交互逻辑，新交互与之叠加、互不冲突。' : '在现有页面基础上加入 JavaScript 交互，不要完全重写视觉设计和布局。'}
2. 尽量保留原有 HTML 结构、CSS 样式和主要内容，页面主题仍是「${theme}」。
3. 交互对象尽量绑定到页面上真实元素；若描述与现有元素对应，请优先修改该元素及其相关脚本。
4. ${newLayer.trigger} 必须能真实触发。
5. 输出完整的单文件 HTML（含内联 CSS 和 JavaScript），可直接运行。
6. 交互适合儿童网页，色彩与动效活泼；不要使用外部网络资源。
7. 只输出 HTML 代码本身，不要 Markdown 代码块。`;
}
