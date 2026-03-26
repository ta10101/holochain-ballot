import { useEffect, useState } from "react";

/** Jurisdictions as peer nodes — illustration only */
const nodes = [
  { id: "a", x: 120, y: 90, label: "OH" },
  { id: "b", x: 280, y: 40, label: "TX" },
  { id: "c", x: 320, y: 160, label: "CA" },
  { id: "d", x: 80, y: 170, label: "ME" },
];

const edges = [
  ["a", "b"],
  ["a", "d"],
  ["b", "c"],
  ["c", "d"],
  ["a", "c"],
];

export function NetworkDiagram({ pulse }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!pulse) return;
    const id = setInterval(() => setTick((t) => t + 1), 900);
    return () => clearInterval(id);
  }, [pulse]);

  const activeEdge = pulse ? tick % edges.length : -1;

  return (
    <svg
      viewBox="0 0 400 220"
      width="100%"
      height="auto"
      style={{ maxWidth: 420, display: "block" }}
      aria-hidden
    >
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {edges.map(([from, to], i) => {
        const A = nodes.find((n) => n.id === from);
        const B = nodes.find((n) => n.id === to);
        const on = pulse && i === activeEdge;
        return (
          <line
            key={`${from}-${to}`}
            x1={A.x}
            y1={A.y}
            x2={B.x}
            y2={B.y}
            stroke={on ? "var(--accent)" : "var(--border)"}
            strokeWidth={on ? 2.5 : 1.2}
            opacity={on ? 1 : 0.55}
            style={{ transition: "stroke 0.4s ease, stroke-width 0.4s ease" }}
          />
        );
      })}
      {nodes.map((n) => (
        <g key={n.id}>
          <circle
            cx={n.x}
            cy={n.y}
            r={22}
            fill="var(--surface)"
            stroke="var(--blue)"
            strokeWidth={2}
            filter="url(#glow)"
          />
          <text
            x={n.x}
            y={n.y + 4}
            textAnchor="middle"
            fill="var(--text)"
            fontSize="11"
            fontWeight="600"
          >
            {n.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
