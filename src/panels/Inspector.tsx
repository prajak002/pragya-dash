import { neighborsOf } from "../canonical/model";
import { colorOf, labelOf } from "../diagrams/layout";
import { jointIdFromElectricalId, useTelemetryStore } from "../state/telemetry";
import { useTwinStore } from "../state/store";

function badgeFor(evidenceClass: "observed" | "asimov-1-reference" | "illustrative") {
  switch (evidenceClass) {
    case "observed":
      return { label: "OBSERVED — from the Kalki source mesh", cls: "observed" };
    case "asimov-1-reference":
      return { label: "REFERENCE — copied from Asimov-1's real spec", cls: "observed" };
    case "illustrative":
      return { label: "ILLUSTRATIVE — placeholder, not sourced", cls: "" };
  }
}

export function Inspector() {
  const model = useTwinStore((s) => s.model);
  const selectedId = useTwinStore((s) => s.selectedId);
  const runTrace = useTwinStore((s) => s.runTrace);
  const telemetry = useTelemetryStore((s) => s.joints);

  if (!model) return null;
  const node = selectedId ? model.nodes[selectedId] : null;
  const liveJoint = node?.kind === "joint" ? telemetry[node.id] : null;
  const liveElectricalJointId = node?.kind === "electrical" ? jointIdFromElectricalId(node.id) : null;
  const liveElectrical = liveElectricalJointId ? telemetry[liveElectricalJointId] : null;

  return (
    <aside className="panel inspector-panel">
      <div className="panel-heading">
        <span>ENGINEERING INSPECTOR</span>
        <span className="inspector-mark">⌁</span>
      </div>
      <div className="inspector-content">
        {!node && (
          <p className="empty-note">Select a part, joint, or electrical component in the 3D view, the
            system tree, or a diagram to inspect it here.</p>
        )}

        {node && node.kind === "part" && (
          <>
            <div className="part-code">{node.groupId} · {node.region}{node.side !== "center" ? ` · ${node.side}` : ""}</div>
            <h2>{node.name}</h2>
            <div className="evidence-badge observed">OBSERVED — from the Kalki source mesh</div>

            <div className="stat-grid">
              <div className="stat-card"><strong>{node.vertices.toLocaleString()}</strong><span>vertices</span></div>
              <div className="stat-card"><strong>{node.triangles.toLocaleString()}</strong><span>triangles</span></div>
            </div>

            <h3>Observed</h3>
            <p>{node.observed}</p>
            <h3>Proposal</h3>
            <p>{node.proposal}</p>
            <h3>Check</h3>
            <p>{node.check}</p>
          </>
        )}

        {node && node.kind === "joint" && (
          <>
            <div className="part-code">JOINT · {node.side !== "center" ? node.side : "center"}</div>
            <h2>{node.label}</h2>
            {(() => {
              const b = badgeFor(node.evidence.class);
              return <div className={`evidence-badge ${b.cls}`}>{b.label}</div>;
            })()}

            <div className="stat-grid">
              <div className="stat-card"><strong>{node.torqueNm}</strong><span>Nm rated torque</span></div>
              <div className="stat-card"><strong>{node.velocityRadS.toFixed(2)}</strong><span>rad/s rated velocity</span></div>
            </div>
            <div className="data-row"><span>Range</span><b>{(node.limitRad[0] * 57.2958).toFixed(0)}° … {(node.limitRad[1] * 57.2958).toFixed(0)}°</b></div>
            <div className="data-row"><span>Axis</span><b>[{node.axis.map((n) => n.toFixed(2)).join(", ")}]</b></div>
            <div className="data-row"><span>Parent link</span><b>{node.parentPart}</b></div>
            <div className="data-row"><span>Child link</span><b>{node.childPart}</b></div>
            <div className="data-row"><span>CAN bus</span><b>{node.canBus}</b></div>

            {liveJoint && (
              <>
                <h3>Live — from the running physics sim</h3>
                <div className="evidence-badge">SIMULATED — computed from live rigid-body state, not measured</div>
                <div className="stat-grid">
                  <div className="stat-card"><strong>{liveJoint.angleDeg.toFixed(1)}°</strong><span>current angle</span></div>
                  <div className="stat-card"><strong>{liveJoint.estimatedTorqueNm.toFixed(1)}</strong><span>Nm estimated torque</span></div>
                  <div className="stat-card"><strong>{liveJoint.elecPowerW.toFixed(1)}</strong><span>W estimated draw</span></div>
                  <div className="stat-card"><strong>{liveJoint.currentA.toFixed(2)}</strong><span>A at 48V</span></div>
                </div>
              </>
            )}

            <h3>Evidence note</h3>
            <p>{node.evidence.note}</p>
          </>
        )}

        {node && node.kind === "electrical" && (
          <>
            <div className="part-code">{node.role.toUpperCase()}</div>
            <h2>{node.label}</h2>
            {(() => {
              const b = badgeFor(node.evidence.class);
              return <div className={`evidence-badge ${b.cls}`}>{b.label}</div>;
            })()}
            <p>{node.detail}</p>

            {liveElectrical && node.role === "driver" && (
              <>
                <h3>Live — from the running physics sim</h3>
                <div className="evidence-badge">SIMULATED — computed from live rigid-body state, not measured</div>
                <div className="stat-grid">
                  <div className="stat-card"><strong>{liveElectrical.elecPowerW.toFixed(1)}</strong><span>W estimated draw</span></div>
                  <div className="stat-card"><strong>{liveElectrical.currentA.toFixed(2)}</strong><span>A at 48V</span></div>
                </div>
              </>
            )}
            {liveElectrical && node.role === "encoder" && (
              <>
                <h3>Live — from the running physics sim</h3>
                <div className="evidence-badge">SIMULATED — computed from live rigid-body state, not measured</div>
                <div className="stat-grid">
                  <div className="stat-card"><strong>{liveElectrical.angleDeg.toFixed(1)}°</strong><span>current angle</span></div>
                  <div className="stat-card"><strong>{liveElectrical.velocityRadS.toFixed(2)}</strong><span>rad/s</span></div>
                </div>
              </>
            )}

            <h3>Evidence note</h3>
            <p>{node.evidence.note}</p>
          </>
        )}

        {node && (
          <>
            <h3>Connections</h3>
            {neighborsOf(model, node.id).map((e, i) => {
              const otherId = e.from === node.id ? e.to : e.from;
              const other = model.nodes[otherId];
              const direction = e.from === node.id ? "→" : "←";
              return (
                <button
                  key={i}
                  className="data-row connection-row"
                  onClick={() => useTwinStore.getState().select(otherId)}
                >
                  <span>
                    <span className={`kind-dot kind-dot--${e.kind}`} /> {e.kind} · {e.role} {direction}
                  </span>
                  <b style={{ color: colorOf(other) }}>{labelOf(other)}</b>
                </button>
              );
            })}

            <button className="primary-button trace-button" onClick={() => runTrace(node.id)}>
              Trace this component
            </button>
          </>
        )}
      </div>
      <div className="inspector-footer">
        <span className="evidence-pill">EVIDENCE FIRST</span>
        <span>Observed ≠ validated</span>
      </div>
    </aside>
  );
}
