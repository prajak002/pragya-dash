import { create } from "zustand";
import type { CanonicalModel } from "../canonical/types";
import { fetchCanonicalModel, traceFromComponent, traceNodeIds, type TraceResult } from "../canonical/model";

export type LayerId =
  | "assembly"
  | "exploded"
  | "mechanical"
  | "electrical"
  | "power"
  | "signal"
  | "trace"
  | "documentation"
  | "configurations"
  | "headv0";

export type CameraPreset = "front" | "three-quarter" | "side" | "rear";
export type MaterialMode = "texture" | "wire" | "xray";

interface TwinState {
  model: CanonicalModel | null;
  loadError: string | null;
  loading: boolean;

  layer: LayerId;
  selectedId: string | null;
  hoveredId: string | null;

  explode: number; // 0..1
  cameraPreset: CameraPreset;
  materialMode: MaterialMode;

  traceRootId: string | null;
  trace: TraceResult | null;

  timelineStep: number; // 0..(steps-1)
  timelinePlaying: boolean;

  init(): Promise<void>;
  setLayer(layer: LayerId): void;
  select(id: string | null): void;
  hover(id: string | null): void;
  setExplode(v: number): void;
  setCameraPreset(p: CameraPreset): void;
  setMaterialMode(m: MaterialMode): void;
  runTrace(id: string): void;
  clearTrace(): void;
  setTimelineStep(step: number): void;
  setTimelinePlaying(playing: boolean): void;
}

export const useTwinStore = create<TwinState>((set, get) => ({
  model: null,
  loadError: null,
  loading: true,

  layer: "assembly",
  selectedId: null,
  hoveredId: null,

  explode: 0,
  cameraPreset: "three-quarter",
  materialMode: "texture",

  traceRootId: null,
  trace: null,

  timelineStep: 0,
  timelinePlaying: false,

  async init() {
    set({ loading: true, loadError: null });
    try {
      const model = await fetchCanonicalModel();
      set({ model, loading: false });
    } catch (err) {
      set({ loadError: err instanceof Error ? err.message : String(err), loading: false });
    }
  },

  setLayer(layer) {
    set({ layer });
    if (layer !== "trace") {
      set({ traceRootId: null, trace: null });
    }
  },

  select(id) {
    set({ selectedId: id });
    const { layer, model } = get();
    if (layer === "trace" && id && model) {
      const trace = traceFromComponent(model, id);
      set({ traceRootId: id, trace });
    }
  },

  hover(id) {
    set({ hoveredId: id });
  },

  setExplode(v) {
    set({ explode: Math.max(0, Math.min(1, v)) });
  },

  setCameraPreset(p) {
    set({ cameraPreset: p });
  },

  setMaterialMode(m) {
    set({ materialMode: m });
  },

  runTrace(id) {
    const { model } = get();
    if (!model) return;
    const trace = traceFromComponent(model, id);
    set({ traceRootId: id, trace, selectedId: id, layer: "trace" });
  },

  clearTrace() {
    set({ traceRootId: null, trace: null });
  },

  setTimelineStep(step) {
    set({ timelineStep: step });
  },
  setTimelinePlaying(playing) {
    set({ timelinePlaying: playing });
  },
}));

export function useTraceNodeIds(): Set<string> {
  const trace = useTwinStore((s) => s.trace);
  if (!trace) return new Set();
  return traceNodeIds(trace);
}
