import type { Ticker, TickersResponse } from '../types';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message: string, public status?: number) { super(message); this.name = 'ApiError'; }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...init.headers },
    });
  } catch {
    throw new ApiError('Не удалось подключиться к серверу. Проверьте соединение и попробуйте снова.');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string; message?: string } | null;
    throw new ApiError(body?.message || body?.error || `Ошибка запроса (${response.status})`, response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  session: () => request<{ user: { id: string; login: string } }>('/api/auth/session'),
  register: (login: string, password: string) => request<void>('/api/auth/register', { method: 'POST', body: JSON.stringify({ login, password }) }),
  login: (login: string, password: string) => request<void>('/api/auth/login', { method: 'POST', body: JSON.stringify({ login, password }) }),
  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),
  getTickers: async () => {
    const result = await request<TickersResponse | Ticker[]>('/api/tickers');
    return Array.isArray(result) ? result : result.tickers;
  },
  addTicker: (symbol: string) => request<unknown>('/api/tickers', { method: 'POST', body: JSON.stringify({ symbol, list: 'WATCHLIST' }) }),
};
