'use client';

import { useEffect, useRef } from 'react';
import { campSongAudioUrl } from '@/lib/camp-song';

/** 按 startedAt 对齐营歌播放进度（老师 / 学生共用） */
export function useCampSongAudio(playing: boolean, startedAt: number | null) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sessionRef = useRef<number | null>(null);

  useEffect(() => {
    if (!playing || !startedAt) {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      sessionRef.current = null;
      return;
    }

    if (sessionRef.current === startedAt) return;
    sessionRef.current = startedAt;

    const audio = audioRef.current ?? new Audio(campSongAudioUrl());
    audioRef.current = audio;

    const syncAndPlay = () => {
      const offset = Math.max(0, (Date.now() - startedAt) / 1000);
      audio.currentTime = offset;
      void audio.play().catch(() => {});
    };

    if (audio.readyState >= 1) {
      syncAndPlay();
    } else {
      audio.addEventListener('loadedmetadata', syncAndPlay, { once: true });
      audio.load();
    }

    return () => {
      audio.removeEventListener('loadedmetadata', syncAndPlay);
    };
  }, [playing, startedAt]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);
}
