import { KALKI_CONFIGURATIONS, KALKI_CONFIGURATIONS_BY_ID } from "../canonical/configurations";
import { useTwinStore } from "../state/store";

/**
 * The detail pane for the Configurations gallery — mirrors the split
 * viewport-diagram pattern the other layers use (3D on the left, context on
 * the right), rather than leaving the generic Inspector empty: config ids
 * aren't nodes in the canonical body model, so the Inspector has nothing to
 * show for them. Click or hover a robot in the 3D view to populate this.
 */
export function ConfigurationDetail() {
  const selectedId = useTwinStore((s) => s.selectedId);
  const hoveredId = useTwinStore((s) => s.hoveredId);
  const select = useTwinStore((s) => s.select);

  const activeId = hoveredId && KALKI_CONFIGURATIONS_BY_ID[hoveredId] ? hoveredId : selectedId;
  const config = activeId ? KALKI_CONFIGURATIONS_BY_ID[activeId] : null;

  if (!config) {
    return (
      <div className="diagram-empty">
        Select a variant in the 3D view to see its use case, key features, and materials.
        <div className="config-quicklist">
          {KALKI_CONFIGURATIONS.map((c) => (
            <button key={c.id} className="config-quicklist-item" onClick={() => select(c.id)}>
              {c.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="diagram-scroll config-detail">
      <div className="part-code">CONFIGURATION</div>
      <h2>{config.label}</h2>
      <div className="evidence-badge">ILLUSTRATIVE — proposed use case, not a validated product spec</div>
      <p className="config-tagline">{config.tagline}</p>

      <h3>Use case</h3>
      <p>{config.useCase}</p>

      <h3>Key features</h3>
      <ul className="config-feature-list">
        {config.keyFeatures.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>

      <div className="data-row">
        <span>Materials</span>
        <b>{config.materials}</b>
      </div>
    </div>
  );
}
