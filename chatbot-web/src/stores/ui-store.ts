import { create } from 'zustand';

interface UiState {
  sidebarOpen: boolean;
  settingsOpen: boolean;
  searchQuery: string;
  toasts: { id: string; message: string; type: 'success' | 'error' | 'info' }[];

  setSidebarOpen: (v: boolean) => void;
  toggleSidebar: () => void;
  setSettingsOpen: (v: boolean) => void;
  setSearchQuery: (v: string) => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

let toastCounter = 0;

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  settingsOpen: false,
  searchQuery: '',
  toasts: [],

  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
  setSettingsOpen: (v) => set({ settingsOpen: v }),
  setSearchQuery: (v) => set({ searchQuery: v }),
  addToast: (message, type = 'info') => {
    const id = `toast-${++toastCounter}`;
    set(s => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), 4000);
  },
  removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}));
