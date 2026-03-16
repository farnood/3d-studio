import { create } from 'zustand';

export type UiMode = "gallery" | "studio" | "export";

interface UiState {
  currentMode: UiMode;
  showGrid: boolean;
  setMode: (mode: UiMode) => void;
  setShowGrid: (showGrid: boolean) => void;
  toggleShowGrid: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  currentMode: "gallery",
  showGrid: true,
  setMode: (mode) => set({ currentMode: mode }),
  setShowGrid: (showGrid) => set({ showGrid }),
  toggleShowGrid: () => set((state) => ({ showGrid: !state.showGrid })),
}));
