import { HEAD_V0_PARTS, HEAD_V0_PRINT_RECOMMENDATIONS } from "../canonical/headV0";
import { useTwinStore } from "../state/store";
import { HeadV0Scene } from "../viewport/HeadV0Scene";

/**
 * "Board view" for the real Kalki V0 Stage-1 head CAD (H1-H4): everything —
 * the 3D preview and every part's real specs — laid out at once in a grid,
 * not behind tabs or a scroll you have to hunt through. Source: the PRAGYA
 * "Kalki V0 | Stage 1 – Head (3D Printable Parts)" reference sheet.
 */
export function HeadV0Board() {
  const selectedId = useTwinStore((s) => s.selectedId);
  const select = useTwinStore((s) => s.select);

  return (
    <div className="headv0-board">
      <div className="headv0-hero">
        <div className="eyebrow">KALKI V0 · STAGE 1 · REAL CAD</div>
        <h1>Head assembly — 4 printable shells</h1>
        <p>
          Unlike the rest of this twin (a concept mesh, re-segmented for illustration), these four parts are real,
          dimensioned, 3D-printable open-hardware CAD from the Kalki V0 build — sovereign embodied AI hardware, Stage 1.
        </p>
      </div>

      <div className="headv0-viewport">
        <HeadV0Scene />
      </div>

      <div className="headv0-grid">
        {HEAD_V0_PARTS.map((part) => (
          <button
            key={part.id}
            className={`headv0-card${selectedId === part.id ? " selected" : ""}`}
            onClick={() => select(part.id)}
          >
            <div className="headv0-card-head">
              <span className="part-code">{part.id}</span>
              <span className="headv0-dims">{part.widthMm} × {part.heightMm} mm</span>
            </div>
            <h3>{part.name}</h3>
            <p className="headv0-subtitle">{part.subtitle}</p>
            <ul>
              {part.keyFeatures.slice(0, 4).map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </button>
        ))}
      </div>

      <div className="headv0-print">
        <span className="evidence-pill">PRINT RECOMMENDATIONS</span>
        {Object.entries(HEAD_V0_PRINT_RECOMMENDATIONS).map(([key, value]) => (
          <span key={key} className="headv0-print-item">
            <b>{key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())}:</b> {value}
          </span>
        ))}
      </div>
    </div>
  );
}
