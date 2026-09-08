import { useTwinStore } from "../state/store";

export function Documentation() {
  const model = useTwinStore((s) => s.model);
  const select = useTwinStore((s) => s.select);
  const setLayer = useTwinStore((s) => s.setLayer);
  if (!model) return null;

  const parts = Object.values(model.nodes).filter((n) => n.kind === "part");
  const joints = Object.values(model.nodes).filter((n) => n.kind === "joint");
  const illustrativeJoints = joints.filter((j) => j.kind === "joint" && j.evidence.class === "illustrative");
  const referenceJoints = joints.filter((j) => j.kind === "joint" && j.evidence.class === "asimov-1-reference");

  return (
    <div className="doc-view">
      <div className="doc-hero">
        <div className="eyebrow">DOCUMENTATION &amp; TRACEABILITY</div>
        <h1>Where every number in this twin comes from</h1>
        <p>
          This dashboard combines two source materials with very different evidentiary weight. Kalki's own
          geometry is <b>measured</b> — every triangle traces back to the source mesh. Its joints, drivers,
          and CAN topology are a <b>reference-informed proposal</b>, shaped on Asimov‑1's real, published
          humanoid architecture, and are not measurements of the Kalki shell itself.
        </p>
      </div>

      <section>
        <h3>Source: {model.sourceMeta.source}</h3>
        <div className="data-row"><span>Unit status</span><b className="unknown">{model.sourceMeta.unitStatus}</b></div>
        <div className="data-row"><span>Preservation policy</span><b>{model.sourceMeta.preservation}</b></div>
        <div className="data-row"><span>Physical parts (K01–K25)</span><b>{parts.length}</b></div>
        <div className="data-row"><span>Proposed joints (DOF)</span><b>{joints.length}</b></div>
        <div className="data-row"><span>— copied from Asimov-1's real URDF</span><b>{referenceJoints.length}</b></div>
        <div className="data-row"><span>— illustrative placeholder</span><b className="unknown">{illustrativeJoints.length}</b></div>
      </section>

      <section>
        <h3>Known discrepancy — surfaced, not resolved</h3>
        <div className="note-card">
          Asimov‑1's own README specs "2 DOF neck (neck yaw, neck pitch)," but its shipped URDF
          (<code>sim-model/urdf/asimov_1.urdf</code>) marks both neck joints <code>fixed</code>. This
          dashboard keeps the neck actuated — matching Kalki's own COLLAR/HEAD split and the README's
          stated spec — but tags both neck joints <code>illustrative</code> rather than silently picking a
          side of that inconsistency.
        </div>
      </section>

      <section>
        <h3>Body regions (click to inspect)</h3>
        <table>
          <thead>
            <tr><th>ID</th><th>Name</th><th>Region</th><th>Triangles</th><th>Evidence</th></tr>
          </thead>
          <tbody>
            {parts.map((p) =>
              p.kind === "part" ? (
                <tr key={p.id} onClick={() => { select(p.id); setLayer("assembly"); }}>
                  <td><code>{p.groupId}</code></td>
                  <td>{p.name}</td>
                  <td>{p.region}</td>
                  <td>{p.triangles.toLocaleString()}</td>
                  <td>observed</td>
                </tr>
              ) : null
            )}
          </tbody>
        </table>
      </section>

      <section>
        <h3>Reference repository</h3>
        <p>
          Mechanical DOF layout, torque/velocity ratings, and the electrical CAN port map (
          <code>LL/RL/LA/RA/NP/NY/W</code>) are shaped on <b>Asimov‑1</b> (Menlo AI/Menlo Robotics),
          a real open-source 1.2 m / 35 kg / 25‑DOF biped: real URDF kinematic tree, a 165‑part
          fabrication manifest across 7 CAD subassemblies, and KiCad schematics for its Motion Control +
          Power Distribution board stack.
        </p>
      </section>
    </div>
  );
}
