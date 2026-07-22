'use client';

import { useEffect, useRef, useState } from 'react';

export interface KidLocalDraftEnvelope<T> {
  version: 1;
  savedAt: number;
  data: T;
}

export function readKidLocalDraft<T>(key: string): KidLocalDraftEnvelope<T> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as KidLocalDraftEnvelope<T>;
    if (parsed?.version !== 1 || !parsed.data) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeKidLocalDraft<T>(key: string, data: T): number {
  const savedAt = Date.now();
  const payload: KidLocalDraftEnvelope<T> = { version: 1, savedAt, data };
  localStorage.setItem(key, JSON.stringify(payload));
  return savedAt;
}

export function clearKidLocalDraft(key: string) {
  localStorage.removeItem(key);
}

export function formatKidLocalDraftHint(savedAt: number | null): string | null {
  if (!savedAt) return null;
  const d = new Date(savedAt);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `💾 已自动保存到本机（${hh}:${mm}），关闭页面后仍可继续编辑`;
}

/** 表单/步骤变更时 debounce 写入 localStorage */
export function useKidLocalDraftSaver<T>(opts: {
  storageKey: string;
  data: T;
  enabled?: boolean;
  debounceMs?: number;
}) {
  const { storageKey, data, enabled = true, debounceMs = 400 } = opts;
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const firstRun = useRef(true);

  useEffect(() => {
    if (!enabled) return;
    if (firstRun.current) {
      firstRun.current = false;
      const existing = readKidLocalDraft<T>(storageKey);
      if (existing) setSavedAt(existing.savedAt);
      return;
    }
    const timer = window.setTimeout(() => {
      setSavedAt(writeKidLocalDraft(storageKey, data));
    }, debounceMs);
    return () => window.clearTimeout(timer);
  }, [storageKey, data, enabled, debounceMs]);

  return { savedAt, hint: formatKidLocalDraftHint(savedAt) };
}
