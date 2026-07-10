export interface StorySceneForm {
  id: string;
  time: string;
  place: string;
  characters: string;
  opening: string;
  climax: string;
  ending: string;
}

export const STORY_FILL_STORAGE_KEY = 'course.story-fill.latest';

export function emptyStoryScene(id?: string): StorySceneForm {
  return {
    id: id ?? `s${Date.now()}`,
    time: '',
    place: '',
    characters: '',
    opening: '',
    climax: '',
    ending: '',
  };
}

export function defaultStoryScenes(): StorySceneForm[] {
  return [
    { ...emptyStoryScene('s1'), time: '一个晴朗的早晨', place: '学校后面的魔法森林', characters: '小明和会说话的松鼠' },
    { ...emptyStoryScene('s2'), time: '中午', place: '森林深处的小溪边', characters: '小明、松鼠和发光蘑菇' },
    { ...emptyStoryScene('s3'), time: '傍晚', place: '回到教室', characters: '小明和全班同学' },
  ];
}

export function buildStoryPrompt(scenes: StorySceneForm[], title?: string): string {
  const blocks = scenes
    .filter((s) => s.time || s.place || s.characters || s.opening || s.climax || s.ending)
    .map((s, i) => {
      return `【场景 ${i + 1}】
时间：${s.time || '（未填）'}
地点：${s.place || '（未填）'}
人物：${s.characters || '（未填）'}
事件-开头：${s.opening || '（未填）'}
事件-高潮：${s.climax || '（未填）'}
事件-结尾：${s.ending || '（未填）'}`;
    })
    .join('\n\n');

  return `你是一位擅长写儿童绘本的作家。请根据下面每个场景卡片的信息，写一篇完整、流畅、适合 8-12 岁小学生阅读的童话故事。

要求：
1. 把每个场景自然串联起来，有清晰的开头、发展、高潮和结局；
2. 语言生动、有画面感，对话适量；
3. 字数约 400-700 字；
4. 只输出故事正文，不要标题、不要分场景小标题、不要解释。

${title ? `故事主题：${title}\n\n` : ''}${blocks}`;
}

export function sceneToImageCaption(s: StorySceneForm): string {
  return [s.time, s.place, s.characters, s.opening, s.climax, s.ending].filter(Boolean).join('，');
}

export interface PictureBookStyle {
  artStyle: string;
  character: string;
  background: string;
}

export function buildPictureBookPrompt(
  style: PictureBookStyle,
  sceneCaption: string,
  sceneIndex: number,
  total: number,
): string {
  return `儿童绘本插画，第 ${sceneIndex + 1}/${total} 页。统一画风：${style.artStyle}。主角设定（每页保持一致）：${style.character}。整体背景风格：${style.background}。本页画面：${sceneCaption}。温馨、适合儿童、无文字、无水印、构图清晰。`;
}

/** 解析藏头字：去掉空格，每个汉字为一行的首字 */
export function parseAcrosticHeads(raw: string): string[] {
  return [...raw.replace(/\s/g, '')].filter((c) => c.trim());
}

export function buildAcrosticPrompt(heads: string, theme: string): string {
  const chars = parseAcrosticHeads(heads);
  const headLines = chars.map((c, i) => `第 ${i + 1} 句首字：「${c}」`).join('\n');

  return `你是一位擅长写儿童诗的诗人。请根据下面的藏头字和创作意向，写一首藏头诗。

藏头字（每句第一个字必须严格对应，按顺序，不可替换同音字）：
${headLines}

创作意向：${theme.trim() || '积极向上、适合小学生阅读'}

要求：
1. 共 ${chars.length} 句，每句第一个字必须分别是：${chars.join('、')}
2. 全诗紧扣创作意向，意境连贯；
3. 语言优美、朗朗上口，适合 8-12 岁小学生；
4. 每句 5-7 个字为佳；
5. 必须先写一行诗题（4-8 个汉字，有诗意、与全诗意境相符），再写诗歌正文；
6. 严格按以下格式输出，不要其它解释：
标题：《诗题》

（诗歌正文，每句单独一行）`;
}

/** 从 AI 回复中解析诗题与正文 */
export function parseAcrosticResponse(raw: string, fallbackHeads: string[]): { title: string; poem: string } {
  const trimmed = raw.trim();
  const titlePatterns = [
    /^标题[：:]\s*[《「]([^》」\n]+)[》」]?/m,
    /^[《「]([^》」\n]{2,12})[》」]\s*$/m,
    /^《([^》\n]{2,12})》/m,
  ];
  for (const re of titlePatterns) {
    const m = trimmed.match(re);
    if (m?.[1]) {
      const title = m[1].trim();
      const poem = trimmed
        .replace(/^标题[：:]\s*[《「][^》」\n]+[》」]?\s*\n*/m, '')
        .replace(/^[《「][^》」\n]+[》」]\s*\n*/m, '')
        .trim();
      return { title, poem: poem || trimmed };
    }
  }
  const heads = fallbackHeads.join('');
  return {
    title: heads.length >= 2 ? `${heads}吟` : '我的藏头诗',
    poem: trimmed,
  };
}
