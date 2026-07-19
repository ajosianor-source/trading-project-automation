"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type WidgetSpan = 4 | 6 | 8 | 12;

interface DashboardLayoutState {
  layouts: Record<string, { order: string[]; spans: Record<string, WidgetSpan> }>;
  ensure: (dashboard: string, ids: string[]) => void;
  move: (dashboard: string, source: string, target: string) => void;
  resize: (dashboard: string, widget: string, span: WidgetSpan) => void;
  reset: (dashboard: string) => void;
}

export const useDashboardLayoutStore = create<DashboardLayoutState>()(
  persist(
    (set) => ({
      layouts: {},
      ensure: (dashboard, ids) =>
        set((state) => {
          if (state.layouts[dashboard]) return state;
          return {
            layouts: {
              ...state.layouts,
              [dashboard]: {
                order: ids,
                spans: Object.fromEntries(ids.map((id) => [id, 6])) as Record<string, WidgetSpan>,
              },
            },
          };
        }),
      move: (dashboard, source, target) =>
        set((state) => {
          const layout = state.layouts[dashboard];
          if (!layout || source === target) return state;
          const order = [...layout.order];
          const sourceIndex = order.indexOf(source);
          const targetIndex = order.indexOf(target);
          if (sourceIndex < 0 || targetIndex < 0) return state;
          order.splice(sourceIndex, 1);
          order.splice(targetIndex, 0, source);
          return { layouts: { ...state.layouts, [dashboard]: { ...layout, order } } };
        }),
      resize: (dashboard, widget, span) =>
        set((state) => {
          const layout = state.layouts[dashboard];
          if (!layout) return state;
          return {
            layouts: {
              ...state.layouts,
              [dashboard]: { ...layout, spans: { ...layout.spans, [widget]: span } },
            },
          };
        }),
      reset: (dashboard) =>
        set((state) => {
          const layouts = { ...state.layouts };
          delete layouts[dashboard];
          return { layouts };
        }),
    }),
    { name: "healthgov-dashboard-layouts" },
  ),
);
