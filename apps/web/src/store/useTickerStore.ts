import { create } from 'zustand';
import { api } from '../api/client';
import type { Ticker } from '../types';

interface TickerState {
  tickers: Ticker[];
  selectedId: string | null;
  loading: boolean;
  error: string | null;
  loadTickers: () => Promise<void>;
  selectTicker: (id: string) => void;
  clear: () => void;
}

export const useTickerStore = create<TickerState>((set) => ({
  tickers: [], selectedId: null, loading: false, error: null,
  loadTickers: async () => {
    set({ loading: true, error: null });
    try {
      const tickers = await api.getTickers();
      set((state) => ({ tickers, selectedId: tickers.some((item) => item.id === state.selectedId) ? state.selectedId : tickers[0]?.id ?? null, loading: false }));
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : 'Не удалось загрузить компании.' });
    }
  },
  selectTicker: (id) => set({ selectedId: id }),
  clear: () => set({ tickers: [], selectedId: null, loading: false, error: null }),
}));
