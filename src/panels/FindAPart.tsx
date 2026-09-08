import { useMemo, useRef, useState } from "react";
import { colorOf, labelOf } from "../diagrams/layout";
import type { GraphNode } from "../canonical/types";
import { useTwinStore, type LayerId } from "../state/store";

/** Which tab a node's detail actually lives on, so a search result jumps somewhere useful. */
function layerFor(node: GraphNode): LayerId {
  if (node.kind === "part") return "assembly";
  if (node.kind === "joint") return "mechanical";
  return "electrical";
}

function kindLabel(node: GraphNode): string {
  if (node.kind === "part") return "PART";
  if (node.kind === "joint") return "JOINT";
  return node.role.toUpperCase();
}

const MAX_RESULTS = 8;

/**
 * A global search over every node in the canonical model (parts, joints,
 * electrical/boards) — unlike SystemTree's search, which only filters the
 * body-structure tree, this reaches joints and electrical components too and
 * jumps to whichever tab actually shows that node's detail.
 */
export function FindAPart() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const model = useTwinStore((s) => s.model);
  const select = useTwinStore((s) => s.select);
  const setLayer = useTwinStore((s) => s.setLayer);

  const results = useMemo(() => {
    if (!model || !query.trim()) return [];
    const q = query.trim().toLowerCase();
    return Object.values(model.nodes)
      .filter((n) => n.id.toLowerCase().includes(q) || labelOf(n).toLowerCase().includes(q))
      .slice(0, MAX_RESULTS);
  }, [model, query]);

  const pick = (node: GraphNode) => {
    setLayer(layerFor(node));
    select(node.id);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="topbar-tool">
      <button
        className={`topbar-tool-btn${open ? " active" : ""}`}
        onClick={() => {
          setOpen((v) => !v);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
      >
        Find a part
      </button>
      {open && (
        <div className="topbar-tool-panel find-a-part-panel">
          <input
            ref={inputRef}
            className="topbar-tool-input"
            placeholder="Actuator, board, part id…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
            }}
          />
          {query.trim() && results.length === 0 && <div className="topbar-tool-empty">No matches.</div>}
          {results.map((n) => (
            <button key={n.id} className="topbar-tool-row" onClick={() => pick(n)}>
              <span className="topbar-tool-row-dot" style={{ background: colorOf(n) }} />
              <span className="topbar-tool-row-text">
                <b>{labelOf(n)}</b>
                <span className="topbar-tool-row-id">{n.id}</span>
              </span>
              <span className="topbar-tool-row-kind">{kindLabel(n)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
