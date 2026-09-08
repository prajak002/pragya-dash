import { useMemo, useState } from "react";
import { boardCallouts, isBoardNode } from "../canonical/boardManual";
import { colorOf } from "../diagrams/layout";
import { useTwinStore } from "../state/store";

/**
 * Catalog of every electrical board in the model (MCB, PDB, the head media
 * unit) — a jump-list into the same pinout manuals BoardManual renders in
 * the Inspector, so there's a way to see "what boards exist" without
 * already knowing their names to search for.
 */
export function BoardDesigns() {
  const [open, setOpen] = useState(false);
  const model = useTwinStore((s) => s.model);
  const select = useTwinStore((s) => s.select);
  const setLayer = useTwinStore((s) => s.setLayer);

  const boards = useMemo(() => {
    if (!model) return [];
    return Object.values(model.nodes).filter(isBoardNode);
  }, [model]);

  return (
    <div className="topbar-tool">
      <button className={`topbar-tool-btn${open ? " active" : ""}`} onClick={() => setOpen((v) => !v)}>
        Board designs
      </button>
      {open && (
        <div className="topbar-tool-panel board-designs-panel">
          {boards.map((b) => {
            if (b.kind !== "electrical") return null;
            const count = model ? boardCallouts(model, b.id).length : 0;
            return (
              <button
                key={b.id}
                className="topbar-tool-row topbar-tool-row--tall"
                onClick={() => {
                  setLayer("electrical");
                  select(b.id);
                  setOpen(false);
                }}
              >
                <span className="topbar-tool-row-dot" style={{ background: colorOf(b) }} />
                <span className="topbar-tool-row-text">
                  <b>{b.label}</b>
                  <span className="topbar-tool-row-detail">{b.detail}</span>
                </span>
                <span className="topbar-tool-row-kind">{count} conn.</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
