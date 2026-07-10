import axios, { AxiosError } from 'axios';

const apiBase = process.env.NEXT_PUBLIC_API_BASE || '/api';

export const api = axios.create({
  baseURL: apiBase,
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => {
    // The backend wraps responses as { success, data }. Unwrap it.
    if (res.data && typeof res.data === 'object' && 'success' in res.data && 'data' in res.data) {
      return { ...res, data: res.data.data };
    }
    return res;
  },
  (err: AxiosError<any>) => {
    const status = err.response?.status;
    const body = err.response?.data;
    let msg = body?.message || err.message || '网络错误';
    if (!err.response && (err.code === 'ERR_NETWORK' || err.message === 'Network Error')) {
      msg = '后端 API 未启动或无法连接。请在 ai-camp 目录运行：./start-dev.sh';
    }
    console.error('[API]', status ?? 'network', body ?? err.message);
    const error = new Error(Array.isArray(msg) ? msg.join('，') : String(msg)) as Error & {
      status?: number;
      responseBody?: unknown;
    };
    error.status = status;
    error.responseBody = body;
    return Promise.reject(error);
  },
);

export type Role = 'student' | 'parent' | 'teacher' | 'admin';
export interface MeUser {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  avatarUrl?: string;
  email?: string;
  phone?: string;
}

export const apiAuth = {
  login: (username: string, password: string) =>
    api.post<{ token: string; user: MeUser }>('/auth/login', { username, password }).then((r) => r.data),
  me: () => api.get<MeUser>('/auth/me').then((r) => r.data),
  logout: () => api.post('/auth/logout').then((r) => r.data),
};
