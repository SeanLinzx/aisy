import { MiniMaxMusicClient } from './minimax-music.client';
import { VolcengineMusicClient } from './volcengine-music.client';
import { MusicClient } from './music-client.types';

/** 内置 MiniMax 密钥，部署到服务器时无需额外配置环境变量。 */
const BUILTIN_MINIMAX_API_KEY =
  'sk-api-D12pK_bnEWV3UY67CYh7Gs_uAl63uO8gBJHHwjEDBAfhjPSJ0I81vxRn8BMkZ3cZswQtcV7CA7fUg28ThCnnbM3RpgIA6uZD1TaNTd5uFkmS2CH5vzUPwgo';

const BUILTIN_MINIMAX_MUSIC_MODEL = 'music-3.0';

function resolveMiniMaxApiKey(): string {
  return process.env.MINIMAX_API_KEY?.trim() || BUILTIN_MINIMAX_API_KEY;
}

function resolveMiniMaxMusicModel(): string {
  return process.env.MINIMAX_MUSIC_MODEL?.trim() || BUILTIN_MINIMAX_MUSIC_MODEL;
}

export function createMusicClient(): MusicClient {
  const provider = (process.env.MUSIC_PROVIDER || 'minimax').trim().toLowerCase();
  const minimaxKey = resolveMiniMaxApiKey();

  if (provider === 'minimax') {
    return new MiniMaxMusicClient(minimaxKey, resolveMiniMaxMusicModel());
  }

  const ak = process.env.VOLC_ACCESS_KEY?.trim();
  const sk = process.env.VOLC_SECRET_KEY?.trim();
  if (provider === 'volcengine' && ak && sk) {
    return new VolcengineMusicClient(ak, sk);
  }

  return new MiniMaxMusicClient(minimaxKey, resolveMiniMaxMusicModel());
}

export function getMiniMaxMusicModel(): string {
  return resolveMiniMaxMusicModel();
}

export function getMusicLyricsMaxLength(client: MusicClient): number {
  return client.providerName === 'minimax-music' ? 3500 : 700;
}
