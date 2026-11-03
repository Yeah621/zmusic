import { create } from 'zustand';
import { applyTheme, type ThemeMode } from '@/lib/theme';

export type MenuState =
  | { kind: 'track'; index: number; right: number; bottom: number }
  | { kind: 'sleep'; right: number; bottom: number };
export type DialogState = { kind: 'playlist'; track?: number; edit?: number } | { kind: 'profile' };
export interface ToastState {
  id: number;
  message: string;
  undo?: () => void;
}

const CHART_INITIAL = 6;
const CHART_STEP = 4;
let toastId = 0;

interface UiState {
  theme: ThemeMode;
  /** Now Playing terbuka (sheet layar penuh di bawah 1180px) */
  npOpen: boolean;
  npTab: 0 | 1;
  /** chip genre Beranda dan jumlah baris Top Chart (bertahan antar halaman seperti di HTML) */
  genre: string;
  chartCount: number;
  toast: ToastState | null;
  menu: MenuState | null;
  dialog: DialogState | null;
  setTheme: (m: ThemeMode) => void;
  setNpOpen: (o: boolean) => void;
  setNpTab: (t: 0 | 1) => void;
  setGenre: (g: string) => void;
  moreChart: () => void;
  showToast: (message: string, undo?: () => void) => void;
  hideToast: () => void;
  openMenu: (m: MenuState) => void;
  closeMenu: () => void;
  openDialog: (d: DialogState) => void;
  closeDialog: () => void;
}

export const useUiStore = create<UiState>()((set) => ({
  theme: 'system',
  npOpen: false,
  npTab: 0,
  genre: 'Semua',
  chartCount: CHART_INITIAL,
  toast: null,
  menu: null,
  dialog: null,
  setTheme: (theme) => {
    set({ theme });
    try {
      localStorage.setItem('zt', theme);
    } catch {
      /* penyimpanan tidak tersedia */
    }
    applyTheme(theme);
  },
  setNpOpen: (npOpen) => set({ npOpen }),
  setNpTab: (npTab) => set({ npTab }),
  setGenre: (genre) => set({ genre, chartCount: CHART_INITIAL }),
  moreChart: () => set((s) => ({ chartCount: s.chartCount + CHART_STEP })),
  showToast: (message, undo) => set({ toast: { id: ++toastId, message, undo } }),
  hideToast: () => set({ toast: null }),
  openMenu: (menu) => set({ menu }),
  closeMenu: () => set({ menu: null }),
  openDialog: (dialog) => set({ dialog }),
  closeDialog: () => set({ dialog: null }),
}));

/** Tampilkan toast dari mana saja (komponen maupun aksi). */
export const toast = (message: string, undo?: () => void): void => useUiStore.getState().showToast(message, undo);
