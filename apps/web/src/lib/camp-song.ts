import { assetPath } from '@/lib/asset-path';

export interface CampSongState {
  active: boolean;
  startedAt: number;
  /** 是否让学生端一起播放；默认 undefined 视为 true（兼容旧数据） */
  syncStudents?: boolean;
}

export const CAMP_SONG_AUDIO_PATH = '/audio/ai-camp-song.mp3';

/** 营歌歌词 */
export const CAMP_SONG_LYRICS = `小小探索家

【A】
夏天来到湘江边
小小少年齐相聚
AI 的世界真神奇
我们一起探索去

【B】
我们是小小探索家
快乐学习每一天
湘江水呀向东流
梦想乘风飞上天`;

export function campSongAudioUrl(): string {
  return assetPath(CAMP_SONG_AUDIO_PATH);
}
