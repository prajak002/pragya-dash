import { useTwinStore, type LayerId } from "../state/store";

const TABS: { id: LayerId; index: string; label: string }[] = [
  { id: "assembly", index: "01", label: "Assembly" },
  { id: "exploded", index: "02", label: "Exploded" },
  { id: "mechanical", index: "03", label: "Mechanical" },
  { id: "electrical", index: "04", label: "Electrical" },
  { id: "power", index: "05", label: "Power" },
  { id: "signal", index: "06", label: "Signal" },
  { id: "trace", index: "07", label: "Trace" },
  { id: "documentation", index: "08", label: "Documentation" },
  { id: "configurations", index: "09", label: "Configurations" },
  { id: "headv0", index: "10", label: "Head V0 (real CAD)" },
];

export function TopTabs() {
  const layer = useTwinStore((s) => s.layer);
  const setLayer = useTwinStore((s) => s.setLayer);

  return (
    <nav className="workspace-nav">
      <div className="view-tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={layer === tab.id}
            className={`view-tab${layer === tab.id ? " active" : ""}`}
            onClick={() => setLayer(tab.id)}
          >
            <span className="tab-index">{tab.index}</span> {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
