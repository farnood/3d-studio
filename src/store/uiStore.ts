import { create } from 'zustand';

export type UiMode = "gallery" | "studio" | "export";

interface UiState {
  beforeModeChange: (() => void) | null;
  currentMode: UiMode;
  showGrid: boolean;
  setMode: (mode: UiMode) => void;
  setBeforeModeChange: (callback: (() => void) | null) => void;
  clearBeforeModeChange: (callback: () => void) => void;
  setShowGrid: (showGrid: boolean) => void;
  toggleShowGrid: () => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  beforeModeChange: null,
  currentMode: "gallery",
  showGrid: true,
  setMode: (mode) => {
    get().beforeModeChange?.();
    set({ currentMode: mode });
  },
  setBeforeModeChange: (callback) => set({ beforeModeChange: callback }),
  clearBeforeModeChange: (callback) =>
    set((state) => ({
      beforeModeChange:
        state.beforeModeChange === callback ? null : state.beforeModeChange,
    })),
  setShowGrid: (showGrid) => set({ showGrid }),
  toggleShowGrid: () => set((state) => ({ showGrid: !state.showGrid })),
}));
