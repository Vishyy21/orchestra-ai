import { create } from 'zustand';

interface AppState {
  isTaskDrawerOpen: boolean;
  openTaskDrawer: () => void;
  closeTaskDrawer: () => void;

  timeframe: string;
  setTimeframe: (tf: string) => void;

  topologyMode: 'Mesh' | 'Hierarchical' | 'Sequential';
  setTopologyMode: (mode: 'Mesh' | 'Hierarchical' | 'Sequential') => void;

  activeInspectorNode: string | null;
  setActiveInspectorNode: (nodeId: string | null) => void;
}

export const useStore = create<AppState>((set) => ({
  isTaskDrawerOpen: false,
  openTaskDrawer: () => set({ isTaskDrawerOpen: true }),
  closeTaskDrawer: () => set({ isTaskDrawerOpen: false }),

  timeframe: 'Live 1m',
  setTimeframe: (timeframe) => set({ timeframe }),

  topologyMode: 'Mesh',
  setTopologyMode: (topologyMode) => set({ topologyMode }),

  activeInspectorNode: null,
  setActiveInspectorNode: (activeInspectorNode) => set({ activeInspectorNode }),
}));
