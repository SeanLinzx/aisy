export type PosterRatioId = '9:16' | '3:4' | '16:9' | '1:1' | '4:3';

export type PosterDeviceId = 'phone' | 'tablet' | 'desktop' | 'projector' | 'print' | 'board';

export interface PosterRatioOption {
  id: PosterRatioId;
  label: string;
  hint: string;
  /** Tailwind aspect ratio class */
  aspectClass: string;
}

export interface PosterDeviceOption {
  id: PosterDeviceId;
  label: string;
  emoji: string;
  hint: string;
}

export interface PosterFormFields {
  ratio: PosterRatioId;
  device: PosterDeviceId;
  title: string;
  headline: string;
  details: string;
  style: string;
  extra: string;
}

export const POSTER_RATIOS: PosterRatioOption[] = [
  { id: '9:16', label: '9:16 竖版', hint: '手机全屏、短视频封面', aspectClass: 'aspect-[9/16]' },
  { id: '3:4', label: '3:4 竖版', hint: 'A4 / 易拉宝 / 展板', aspectClass: 'aspect-[3/4]' },
  { id: '16:9', label: '16:9 横版', hint: '电脑屏、教室大屏', aspectClass: 'aspect-video' },
  { id: '1:1', label: '1:1 方形', hint: '朋友圈、头像区', aspectClass: 'aspect-square' },
  { id: '4:3', label: '4:3 横版', hint: '平板、投影', aspectClass: 'aspect-[4/3]' },
];

export const POSTER_DEVICES: PosterDeviceOption[] = [
  { id: 'phone', label: '手机', emoji: '📱', hint: '小屏竖滑浏览' },
  { id: 'tablet', label: '平板', emoji: '📟', hint: '中等屏幕展示' },
  { id: 'desktop', label: '电脑屏幕', emoji: '💻', hint: '网页 / 桌面壁纸' },
  { id: 'projector', label: '教室大屏', emoji: '📺', hint: '远距离可读、字要大' },
  { id: 'print', label: '打印海报', emoji: '🖨️', hint: 'A4 / A3 打印' },
  { id: 'board', label: '展板 / 易拉宝', emoji: '🪧', hint: '线下活动立牌' },
];

export const DEFAULT_POSTER_FORM: PosterFormFields = {
  ratio: '3:4',
  device: 'print',
  title: '',
  headline: '',
  details: '',
  style: '',
  extra: '',
};

export function getPosterRatio(id: PosterRatioId): PosterRatioOption {
  return POSTER_RATIOS.find((r) => r.id === id) ?? POSTER_RATIOS[1];
}

export function getPosterDevice(id: PosterDeviceId): PosterDeviceOption {
  return POSTER_DEVICES.find((d) => d.id === id) ?? POSTER_DEVICES[4];
}

export function buildPosterPrompt(form: PosterFormFields): string {
  const ratio = getPosterRatio(form.ratio);
  const device = getPosterDevice(form.device);
  const lines = [
    '请生成一张 HTML 海报（单文件、内联 CSS，视觉活泼、适合小学生审美）。',
    '',
    '【版式与展示】',
    `- 海报比例：${ratio.label}（${ratio.hint}）`,
    `- 展示设备：${device.emoji} ${device.label}（${device.hint}）`,
    `- 请按上述比例设置页面宽高比，文字层级清晰，主标题足够大，${device.id === 'projector' || device.id === 'board' ? '字号偏大、对比度高，适合远距离阅读' : '移动端也要看得清楚'}.`,
  ];

  if (form.title.trim()) lines.push('', '【海报主题 / 标题】', form.title.trim());
  if (form.headline.trim()) lines.push('', '【主宣传语 / 口号】', form.headline.trim());
  if (form.details.trim()) lines.push('', '【详细内容】', form.details.trim());
  if (form.style.trim()) lines.push('', '【风格与配色】', form.style.trim());
  if (form.extra.trim()) lines.push('', '【其他要求】', form.extra.trim());

  return lines.join('\n');
}

export function posterFormFromTemplatePrompt(prompt: string, templateName?: string): Partial<PosterFormFields> {
  const next: Partial<PosterFormFields> = { details: prompt };
  if (templateName) {
    const cleaned = templateName.replace(/^海报[：:]\s*/, '').trim();
    if (cleaned) next.title = cleaned;
  }
  const styleMatch = prompt.match(/主色\s*([\u4e00-\u9fa5a-zA-Z]+)|风格[：:\s]*([^，,。]+)/);
  if (styleMatch) {
    next.style = (styleMatch[1] || styleMatch[2] || '').trim();
  }
  return next;
}

export function isPosterFormReady(form: PosterFormFields): boolean {
  return Boolean(form.title.trim() || form.headline.trim() || form.details.trim());
}
