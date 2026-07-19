"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "light" | "dark" | "system";
interface UiState {
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  theme: Theme;
  globalSearch: string;
  toggleSidebar: () => void;
  setMobileNav: (open: boolean) => void;
  setTheme: (theme: Theme) => void;
  setGlobalSearch: (value: string) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      mobileNavOpen: false,
      theme: "dark",
      globalSearch: "",
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setMobileNav: (mobileNavOpen) => set({ mobileNavOpen }),
      setTheme: (theme) => set({ theme }),
      setGlobalSearch: (globalSearch) => set({ globalSearch }),
    }),
    { name: "healthgov-ui", partialize: ({ sidebarCollapsed, theme }) => ({ sidebarCollapsed, theme }) },
  ),
);

