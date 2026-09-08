import { useEffect, useState } from "react";
import { labelOf } from "../diagrams/layout";
import { useTwinStore } from "../state/store";

/**
 * A small label that follows the cursor while hovering a part/joint/
 * electrical component — in the 3D view or a diagram, both of which already
 * call the same store `hover(id)`. Pure DOM overlay (not 3D text) so it
 * never has to fight camera/scale/occlusion.
 */
export function HoverTooltip() {
  const model = useTwinStore((s) => s.model);
  const hoveredId = useTwinStore((s) => s.hoveredId);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const onMove = (e: PointerEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  if (!hoveredId || !pos || !model) return null;
  const node = model.nodes[hoveredId];
  if (!node) return null;

  return (
    <div className="hover-tooltip" style={{ left: pos.x + 14, top: pos.y + 16 }}>
      {labelOf(node)}
    </div>
  );
}
