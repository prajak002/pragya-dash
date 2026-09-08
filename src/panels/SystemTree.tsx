import { useMemo, useState } from "react";
import { useTwinStore } from "../state/store";
import { colorOf, labelOf } from "../diagrams/layout";

export function SystemTree() {
  const model = useTwinStore((s) => s.model);
  const selectedId = useTwinStore((s) => s.selectedId);
  const select = useTwinStore((s) => s.select);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    if (!model) return [];
    const q = query.trim().toLowerCase();
    return model.subsystems.map((sub) => ({
      ...sub,
      memberIds: q
        ? sub.memberIds.filter((id) => {
            const node = model.nodes[id];
            return id.toLowerCase().includes(q) || labelOf(node).toLowerCase().includes(q);
          })
        : sub.memberIds,
    }));
  }, [model, query]);

  if (!model) return <div className="tree-loading">Loading assembly tree…</div>;

  return (
    <aside className="panel tree-panel">
      <div className="panel-heading">
        <span>SYSTEM EXPLORER</span>
        <span className="count-pill">{Object.keys(model.nodes).length}</span>
      </div>
      <div className="tree-search">
        <input
          placeholder="Find a component or id…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="tree-scroll">
        {filtered.map((sub) => {
          const isCollapsed = collapsed[sub.id];
          if (query && sub.memberIds.length === 0) return null;
          return (
            <div className="tree-section" key={sub.id}>
              <button
                className="tree-section-title"
                onClick={() => setCollapsed((c) => ({ ...c, [sub.id]: !c[sub.id] }))}
              >
                <span>{isCollapsed ? "▸" : "▾"} {sub.label}</span>
                <span className="count-pill">{sub.memberIds.length}</span>
              </button>
              {!isCollapsed &&
                sub.memberIds.map((id) => {
                  const node = model.nodes[id];
                  return (
                    <button
                      key={id}
                      className={`tree-item${selectedId === id ? " active" : ""}`}
                      onClick={() => select(id)}
                    >
                      <span className="part-dot" style={{ background: colorOf(node), borderColor: colorOf(node) }} />
                      <span className="part-text">
                        <span className="part-name">{labelOf(node)}</span>
                        <span className="part-id">{id}</span>
                      </span>
                    </button>
                  );
                })}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
