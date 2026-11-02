import { useCallback, useEffect, useState } from 'react';

export async function api<T>(path: string, options: { method?: string; data?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  const token = sessionStorage.getItem('nanyao-token');
  const response = await fetch(`/api${path}`, {
    method: options.method ?? 'GET',
    headers: { ...(options.data !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: options.data !== undefined ? JSON.stringify(options.data) : undefined,
    signal: options.signal,
  });
  const body = await response.json();
  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login') window.dispatchEvent(new Event('nanyao-logout'));
    throw new Error(Array.isArray(body.message) ? body.message.join('；') : body.message ?? '请求失败，请稍后重试。');
  }
  return body as T;
}

export function useData<T>(path: string | null) {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    if (!path) { setData(undefined); setLoading(false); setError(''); return; }
    const controller = new AbortController();
    setLoading(true);
    setError('');
    api<T>(path, { signal: controller.signal })
      .then((value) => { if (!controller.signal.aborted) setData(value); })
      .catch((err: Error) => { if (!controller.signal.aborted) { setError(err.message); setData(undefined); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [path, version]);
  return { data, loading, error, reload };
}
