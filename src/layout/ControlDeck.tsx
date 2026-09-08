import { useTwinStore, type CameraPreset, type MaterialMode } from "../state/store";
import { labelOf } from "../diagrams/layout";
import { totalPowerW, useTelemetryStore } from "../state/telemetry";

const CAMERA_PRESETS: { id: CameraPreset; label: string }[] = [
  { id: "front", label: "Front" },
  { id: "three-quarter", label: "¾" },
  { id: "side", label: "Side" },
  { id: "rear", label: "Rear" },
];

const MATERIAL_MODES: { id: MaterialMode; label: string }[] = [
  { id: "texture", label: "Texture" },
  { id: "wire", label: "Wire" },
  { id: "xray", label: "X-ray" },
];

export function ControlDeck() {
  const layer = useTwinStore((s) => s.layer);
  const explode = useTwinStore((s) => s.explode);
  const setExplode = useTwinStore((s) => s.setExplode);
  const cameraPreset = useTwinStore((s) => s.cameraPreset);
  const setCameraPreset = useTwinStore((s) => s.setCameraPreset);
  const materialMode = useTwinStore((s) => s.materialMode);
  const setMaterialMode = useTwinStore((s) => s.setMaterialMode);
  const model = useTwinStore((s) => s.model);
  const traceRootId = useTwinStore((s) => s.traceRootId);
  const clearTrace = useTwinStore((s) => s.clearTrace);
  const telemetryJoints = useTelemetryStore((s) => s.joints);

  const show3d = layer !== "configurations" && layer !== "documentation";
  const showPower = layer === "mechanical" || layer === "electrical" || layer === "power" || layer === "signal" || layer === "trace";

  return (
    <footer className="control-deck">
      {show3d && (
        <>
          <div className="explode-cluster">
            <div className="camera-tools">
              {CAMERA_PRESETS.map((p) => (
                <button key={p.id} className={cameraPreset === p.id ? "active" : ""} onClick={() => setCameraPreset(p.id)}>
                  {p.label}
                </button>
              ))}
            </div>
            <div className="display-tools">
              {MATERIAL_MODES.map((m) => (
                <button key={m.id} className={materialMode === m.id ? "active" : ""} onClick={() => setMaterialMode(m.id)}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="explode-track">
            <div className="track-heading">
              <label htmlFor="explodeSlider">INSPECTION EXPLOSION</label>
              <output>{Math.round(explode * 100)}%</output>
            </div>
            <input
              id="explodeSlider"
              type="range"
              min={0}
              max={100}
              value={Math.round(explode * 100)}
              onChange={(e) => setExplode(Number(e.target.value) / 100)}
            />
            <div className="track-caption">
              <span>Original assembly</span>
              <span>Separated regions</span>
            </div>
          </div>
        </>
      )}

      {showPower && (
        <div className="live-power" title="Total estimated system draw, summed from the live physics simulation">
          <span className="evidence-pill">LIVE</span>
          <b>{totalPowerW(telemetryJoints).toFixed(1)} W</b>
          <span className="dim-caption">system draw</span>
        </div>
      )}

      {layer === "trace" && (
        <div className="trace-status">
          {traceRootId && model ? (
            <>
              <span className="evidence-pill">TRACING</span>
              <b>{labelOf(model.nodes[traceRootId])}</b>
              <button className="secondary-button" onClick={clearTrace}>Clear</button>
            </>
          ) : (
            <span>Select any component to trace its mechanical, power, and signal paths.</span>
          )}
        </div>
      )}
    </footer>
  );
}
