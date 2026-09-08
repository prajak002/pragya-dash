import { useEffect } from "react";
import "./App.css";
import { LayerDiagram } from "./diagrams/LayerDiagram";
import { TraceDiagram } from "./diagrams/TraceDiagram";
import { ControlDeck } from "./layout/ControlDeck";
import { TopTabs } from "./layout/TopTabs";
import { BoardDesigns } from "./panels/BoardDesigns";
import { ConfigurationDetail } from "./panels/ConfigurationDetail";
import { Documentation } from "./panels/Documentation";
import { FindAPart } from "./panels/FindAPart";
import { HeadV0Board } from "./panels/HeadV0Board";
import { HoverTooltip } from "./panels/HoverTooltip";
import { Inspector } from "./panels/Inspector";
import { SystemTree } from "./panels/SystemTree";
import { useTwinStore } from "./state/store";
import { Scene } from "./viewport/Scene";

const LAYER_COPY: Record<string, { eyebrow: string; title: string; subtitle: string }> = {
  assembly: { eyebrow: "SOURCE-PRESERVING VIEW", title: "Kalki / full body", subtitle: "Select a region to inspect." },
  exploded: { eyebrow: "EXPLODED ASSEMBLY", title: "Kalki / exploded", subtitle: "Drag the explosion slider below." },
  mechanical: { eyebrow: "MECHANICAL LAYER", title: "Structure, joints & drivetrain", subtitle: "Proposed 25-DOF skeleton, reference-informed by Asimov-1." },
  electrical: { eyebrow: "ELECTRICAL LAYER", title: "Compute, drivers & CAN buses", subtitle: "Modeled on Asimov-1's real MCB/PDB stack." },
  power: { eyebrow: "POWER LAYER", title: "Battery to actuator", subtitle: "Illustrative rail architecture." },
  signal: { eyebrow: "SIGNAL LAYER", title: "Sensors & communication", subtitle: "Encoder / CAN / compute path." },
  trace: { eyebrow: "TRACE SYSTEM", title: "Follow one component everywhere", subtitle: "One selection, every layer." },
  configurations: { eyebrow: "CONFIGURATIONS GALLERY", title: "Four Kalki variants", subtitle: "Weave · Kinetic Armor · Hospitality · Field Warrior." },
  headv0: { eyebrow: "KALKI V0 · STAGE 1", title: "Real head CAD", subtitle: "H1–H4, real 3D-printable open-hardware parts." },
};

function ViewportTitle() {
  const layer = useTwinStore((s) => s.layer);
  const copy = LAYER_COPY[layer] ?? LAYER_COPY.assembly;
  return (
    <div className="viewport-title">
      <div className="eyebrow">{copy.eyebrow}</div>
      <h1>{copy.title}</h1>
      <p>{copy.subtitle}</p>
    </div>
  );
}

/**
 * The 3D canvas is always mounted here, in the same place, for every layer —
 * see viewport/Scene.tsx for why. Layers only ever toggle CSS visibility or
 * an overlay on top of it, never unmount/remount it.
 */
function LayerCanvas() {
  const layer = useTwinStore((s) => s.layer);
  const showDiagram =
    layer === "mechanical" || layer === "electrical" || layer === "power" || layer === "signal" || layer === "trace" || layer === "configurations";
  const hide3d = layer === "documentation" || layer === "headv0";

  if (layer === "headv0") {
    return (
      <div className="viewport-stage">
        <HeadV0Board />
      </div>
    );
  }

  return (
    <div className={`viewport-stage${showDiagram ? " viewport-stage--split" : ""}`}>
      <div className={`viewport-3d${hide3d ? " viewport-3d--hidden" : ""}`}>
        <Scene />
        <ViewportTitle />
      </div>
      {showDiagram && (
        <div className="viewport-diagram">
          {layer === "mechanical" && <LayerDiagram kind="mechanical" />}
          {layer === "electrical" && <LayerDiagram kind="signal" />}
          {layer === "power" && <LayerDiagram kind="power" />}
          {layer === "signal" && <LayerDiagram kind="signal" />}
          {layer === "trace" && <TraceDiagram />}
          {layer === "configurations" && <ConfigurationDetail />}
        </div>
      )}
      {layer === "documentation" && (
        <div className="viewport-documentation-overlay">
          <Documentation />
        </div>
      )}
    </div>
  );
}

export default function App() {
  const init = useTwinStore((s) => s.init);
  const loading = useTwinStore((s) => s.loading);
  const loadError = useTwinStore((s) => s.loadError);
  const layer = useTwinStore((s) => s.layer);
  const isHeadV0 = layer === "headv0";
  // Configurations gets its own detail pane (ConfigurationDetail, in place of
  // the diagram slot) — the generic SystemTree/Inspector operate on the
  // 25-part body model, which has nothing to do with these 4 named variants.
  const isFullBleed = isHeadV0 || layer === "configurations";

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#">
          <span className="brand-mark">क</span>
          <span className="brand-name">Kalki<span className="brand-separator">/</span><span className="brand-product">DIGITAL ENGINEERING TWIN</span></span>
        </a>
        <div className="topbar-tools">
          <FindAPart />
          <BoardDesigns />
        </div>
        <span className="revision">REFERENCE: ASIMOV-1 <b>25 DOF</b></span>
      </header>

      <TopTabs />

      <main className={`workspace${isFullBleed ? " workspace--full" : ""}`}>
        {!isFullBleed && <SystemTree />}
        <LayerCanvas />
        {!isFullBleed && <Inspector />}
      </main>

      <ControlDeck />
      <HoverTooltip />

      {loading && (
        <div className="load-overlay">
          <div className="load-card">
            <span className="loader-orbit" />
            <div className="eyebrow">KALKI / DIGITAL TWIN</div>
            <h2>Loading canonical engineering model…</h2>
            <p>Decoding 25 real body regions and building the mechanical/electrical graph.</p>
          </div>
        </div>
      )}
      {loadError && (
        <div className="load-overlay">
          <div className="load-card">
            <div className="eyebrow">LOAD ERROR</div>
            <h2>{loadError}</h2>
            <p>Run <code>python3 tools/ingest_kalki.py</code> from the project root, then reload.</p>
          </div>
        </div>
      )}
    </div>
  );
}
