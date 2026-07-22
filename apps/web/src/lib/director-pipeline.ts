import {
  STORY_FILL_STORAGE_KEY,
  type PictureBookStyle,
  type StorySceneForm,
} from '@/lib/story-course';

export const DIRECTOR_SCRIPT_KEY = 'course.ai-director.script';
export const DIRECTOR_STORYBOARD_KEY = 'course.ai-director.storyboard';

export interface DirectorScriptData {
  title: string;
  scenes: StorySceneForm[];
  story: string;
  savedAt: number;
}

export interface DirectorStoryboardScene {
  id: string;
  caption: string;
  imageUrl?: string;
}

export interface DirectorStoryboardData {
  title: string;
  style: PictureBookStyle;
  scenes: DirectorStoryboardScene[];
  savedAt: number;
}

export interface DirectorEmbedProps {
  /** 嵌入「AI 小导演」三步流程 */
  embedded?: boolean;
  /** 步骤展示标题，如「剧本创作」 */
  stepTitle?: string;
  /** 点击「下一步」 */
  onNextStep?: () => void;
}

export function saveDirectorScript(data: Omit<DirectorScriptData, 'savedAt'>) {
  const payload: DirectorScriptData = { ...data, savedAt: Date.now() };
  localStorage.setItem(DIRECTOR_SCRIPT_KEY, JSON.stringify(payload));
  localStorage.setItem(
    STORY_FILL_STORAGE_KEY,
    JSON.stringify({ title: data.title, scenes: data.scenes, story: data.story, savedAt: payload.savedAt }),
  );
  return payload;
}

export function loadDirectorScript(): DirectorScriptData | null {
  try {
    const raw = localStorage.getItem(DIRECTOR_SCRIPT_KEY);
    if (raw) return JSON.parse(raw) as DirectorScriptData;
    const legacy = localStorage.getItem(STORY_FILL_STORAGE_KEY);
    if (!legacy) return null;
    const data = JSON.parse(legacy) as DirectorScriptData;
    if (data.story?.trim()) return { ...data, savedAt: data.savedAt ?? Date.now() };
  } catch {
    /* ignore */
  }
  return null;
}

export function saveDirectorStoryboard(data: Omit<DirectorStoryboardData, 'savedAt'>) {
  const payload: DirectorStoryboardData = { ...data, savedAt: Date.now() };
  localStorage.setItem(DIRECTOR_STORYBOARD_KEY, JSON.stringify(payload));
  return payload;
}

export function loadDirectorStoryboard(): DirectorStoryboardData | null {
  try {
    const raw = localStorage.getItem(DIRECTOR_STORYBOARD_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DirectorStoryboardData;
  } catch {
    return null;
  }
}

/** 从绘本分镜页跳转到首尾帧生视频时设置，frame-video 挂载后消费并清除 */
export const PICTURE_BOOK_IMPORT_FLAG = 'course.picture-book.import-pending';

export function markPictureBookImportPending() {
  localStorage.setItem(PICTURE_BOOK_IMPORT_FLAG, String(Date.now()));
}

export function consumePictureBookImportPending(): boolean {
  const v = localStorage.getItem(PICTURE_BOOK_IMPORT_FLAG);
  if (!v) return false;
  localStorage.removeItem(PICTURE_BOOK_IMPORT_FLAG);
  return true;
}

/** 将绘本分镜（每页插图 + 画面描述）转为首尾帧生视频的帧序列与过渡描述 */
export function storyboardToFrameVideoInput(
  sb: DirectorStoryboardData,
): { frames: string[]; descs: string[]; pageCount: number } | null {
  const scenes = sb.scenes.filter((s) => typeof s.imageUrl === 'string' && s.imageUrl.trim());
  if (scenes.length < 2) return null;

  const frames = scenes.map((s) => s.imageUrl!.trim());
  const descs: string[] = [];
  for (let i = 0; i < scenes.length - 1; i++) {
    const from = scenes[i].caption.trim();
    const to = scenes[i + 1].caption.trim();
    if (from && to) {
      descs.push(`${from}，镜头过渡到：${to}`);
    } else if (to) {
      descs.push(to);
    } else if (from) {
      descs.push(from);
    } else {
      descs.push('画面自然推进，镜头流畅过渡');
    }
  }
  return { frames, descs, pageCount: scenes.length };
}

export function savePictureBookForFrameVideo(data: {
  title: string;
  style: PictureBookStyle;
  scenes: DirectorStoryboardScene[];
}): { ok: true; input: { frames: string[]; descs: string[]; pageCount: number } } | { ok: false; reason: string } {
  const payload = saveDirectorStoryboard(data);
  const input = storyboardToFrameVideoInput(payload);
  if (!input) {
    return { ok: false, reason: '请至少生成 2 页插图后再导入到首尾帧生视频。' };
  }
  return { ok: true, input };
}
