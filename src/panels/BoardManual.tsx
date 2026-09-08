import { useMemo } from "react";
import { boardCallouts } from "../canonical/boardManual";
import type { ElectricalNode } from "../canonical/types";
import { useTwinStore } from "../state/store";

const ROW_H = 44;
const MARGIN_Y = 30;
const RECT_W = 200;
const COL_MARGIN = 46; // circle center distance from viewBox edge
const CIRCLE_R = 11;

function evidenceTag(evidence: ElectricalNode["evidence"]) {
  switch (evidence.class) {
    case "asimov-1-reference":
      return { text: "REF", cls: "observed" };
    case "observed":
      return { text: "OBS", cls: "observed" };
    case "illustrative":
      return { text: "ILL", cls: "" };
  }
}

/**
 * A "hookup guide" pinout diagram for one board node — numbered leader-line
 * callouts around a board outline, plus a legend table below. Callouts are
 * derived live from the canonical model's edges (see boardCallouts), not
 * hand-drawn per board, so this never claims a real physical layout: the
 * rectangle is a labeled interface diagram, not a photograph or a traced PCB.
 */
export function BoardManual({ board }: { board: ElectricalNode }) {
  const model = useTwinStore((s) => s.model);

  const callouts = useMemo(() => (model ? boardCallouts(model, board.id) : []), [model, board.id]);

  const left = callouts.filter((_, i) => i % 2 === 0);
  const right = callouts.filter((_, i) => i % 2 === 1);
  const rows = Math.max(left.length, right.length, 1);
  const height = rows * ROW_H + MARGIN_Y * 2;
  const width = 620;
  const rectX = (width - RECT_W) / 2;
  const rectY = MARGIN_Y;
  const rectH = height - MARGIN_Y * 2;

  const rowY = (i: number) => MARGIN_Y + ROW_H / 2 + i * ROW_H;

  return (
    <div className="board-manual">
      <div className="board-manual-titleblock">
        <div>
          <div className="part-code">BOARD · {board.role.toUpperCase().replace("-", " ")}</div>
          <h2>{board.label}</h2>
        </div>
        <div className="board-manual-idbox">
          <span>BOARD ID</span>
          <b>{board.id}</b>
        </div>
      </div>
      <p className="config-tagline">{board.detail}</p>

      <svg viewBox={`0 0 ${width} ${height}`} className="board-manual-svg" preserveAspectRatio="xMidYMid meet">
        <rect x={rectX} y={rectY} width={RECT_W} height={rectH} rx={6} className="board-manual-rect" />
        <text x={width / 2} y={rectY + rectH / 2} textAnchor="middle" dominantBaseline="middle" className="board-manual-rect-label">
          {board.label}
        </text>

        {left.map((c, i) => {
          const y = rowY(i);
          return (
            <g key={`l-${c.num}`}>
              <line x1={COL_MARGIN} y1={y} x2={rectX} y2={y} className="board-manual-leader" />
              <circle cx={COL_MARGIN} cy={y} r={CIRCLE_R} className="board-manual-callout" />
              <text x={COL_MARGIN} y={y} textAnchor="middle" dominantBaseline="middle" className="board-manual-num">
                {c.num}
              </text>
            </g>
          );
        })}
        {right.map((c, i) => {
          const y = rowY(i);
          const x = width - COL_MARGIN;
          return (
            <g key={`r-${c.num}`}>
              <line x1={x} y1={y} x2={rectX + RECT_W} y2={y} className="board-manual-leader" />
              <circle cx={x} cy={y} r={CIRCLE_R} className="board-manual-callout" />
              <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="board-manual-num">
                {c.num}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="board-manual-legend">
        <div className="board-manual-legend-heading">KEY</div>
        {callouts.map((c) => {
          const tag = evidenceTag(c.evidence);
          return (
            <div key={c.num} className="board-manual-legend-row">
              <span className="board-manual-legend-num">{c.num}</span>
              <span className="board-manual-legend-text">
                <b>{c.label}</b>
                {c.detail && <span className="board-manual-legend-detail"> — {c.detail}</span>}
              </span>
              <span className={`evidence-tag${tag.cls ? ` ${tag.cls}` : ""}`}>{tag.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
