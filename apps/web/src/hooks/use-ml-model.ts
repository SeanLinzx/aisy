'use client';

import { useCallback, useState } from 'react';

/** 懒加载 ML 模型的通用 hook（Digit / Pose 等 demo 复用） */
export function useLazyModel<T>(loader: () => Promise<T>) {
  const [model, setModel] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<T> => {
    if (model) return model;
    setLoading(true);
    setError(null);
    try {
      const loaded = await loader();
      setModel(loaded);
      return loaded;
    } catch (e) {
      const msg = (e as Error)?.message || '模型加载失败，请检查网络后重试';
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [loader, model]);

  return { model, loading, error, load };
}
