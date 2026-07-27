import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface FocusSession {
  assignmentId: string;
  assignmentTitle: string;
  courseTitle: string;
  currentStep: {
    id: string | null;
    title: string;
  };
  startedAt: number;
  duration: number;
}

interface AppStoreState {
  sidebarOpen: boolean;
  hasHydrated: boolean;
  focusSession: FocusSession | null;
  setSidebarOpen: (value: boolean) => void;
  setHasHydrated: (value: boolean) => void;
  startFocusSession: (session: FocusSession) => void;
  clearFocusSession: () => void;
}

export const useAppStore = create<AppStoreState>()(
  persist(
    (set) => ({
      sidebarOpen: false,
      hasHydrated: false,
      focusSession: null,
      setSidebarOpen: (value) => set({ sidebarOpen: value }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
      startFocusSession: (session) => set({ focusSession: session }),
      clearFocusSession: () => set({ focusSession: null }),
    }),
    {
      name: "dueable-app-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        focusSession: state.focusSession,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);