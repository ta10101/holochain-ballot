import { useMemo, useState } from "react";
import { NetworkDiagram } from "./NetworkDiagram.jsx";

function fakeHash(seed) {
  const hex = [...seed].map((c) => c.charCodeAt(0).toString(16)).join("");
  return `uhCkk${hex.slice(0, 10)}…${hex.slice(-6)}`;
}

/** Big friendly line + optional nerd caption inside <details> */
const STEPS = [
  {
    id: "intro",
    title: "Start",
    simple: "Imagine lots of states sharing the same rulebook—there isn’t one secret computer that decides everything.",
    caption:
      "Illustrative: peer nodes share the same DNA rules—no single central tally server is required for validation.",
  },
  {
    id: "election",
    title: "Define ballot",
    simple: "Step 1: we officially post what people are allowed to vote on—like printing the ballot.",
    caption: "A signed election record (fictional presidential ticket lineup) is published to the DHT.",
  },
  {
    id: "sync",
    title: "Replication",
    simple: "Step 2: that ballot info travels to other places so everyone is working from the same list.",
    caption: "Ballot metadata replicates across jurisdictions so every node can validate votes the same way.",
  },
  {
    id: "register",
    title: "Voter check-in",
    simple: "Step 3: you “check in” so the system knows you’re allowed to vote (ID + 2FA happens here in real life).",
    caption: "Each voter commits registration; in production, MFA and ID proof wrap this step.",
  },
  {
    id: "votes",
    title: "Cast ballots",
    simple: "Step 4: you pick a choice. Your pick gets a digital seal so it can’t be swapped later without noticing.",
    caption: "Votes link to the election entry—auditors can trace each choice to signed actions.",
  },
  {
    id: "tally",
    title: "Results + audit hashes",
    simple: "Step 5: anyone can count the public votes and get the same numbers—and see receipts (hashes) for each vote.",
    caption: "Counts and sorted vote action hashes support transparent verification.",
  },
  {
    id: "double",
    title: "Stop double voting",
    simple: "If you try to vote again with the same identity, the app says no. That’s the “you already voted” moment.",
    caption: "The same identity cannot vote twice in the same race—enforced in the coordinator zome.",
  },
];

function StepPicture({ id }) {
  const s = 100;
  const common = { width: s, height: s, viewBox: "0 0 100 100", "aria-hidden": true };
  switch (id) {
    case "intro":
      return (
        <svg {...common}>
          <circle cx="30" cy="50" r="14" fill="var(--surface)" stroke="var(--blue)" strokeWidth="2" />
          <circle cx="70" cy="50" r="14" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2" />
          <path d="M44 50h12" stroke="var(--muted)" strokeWidth="2" strokeDasharray="4 3" />
        </svg>
      );
    case "election":
      return (
        <svg {...common}>
          <rect x="28" y="22" width="44" height="56" rx="4" fill="var(--bg2)" stroke="var(--blue)" strokeWidth="2" />
          <path d="M36 36h28M36 46h24M36 56h28" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "sync":
      return (
        <svg {...common}>
          <path d="M20 50 Q50 28 80 50" fill="none" stroke="var(--accent)" strokeWidth="2" />
          <path d="M20 50 Q50 72 80 50" fill="none" stroke="var(--blue)" strokeWidth="2" />
          <polygon points="78,48 86,50 78,52" fill="var(--accent)" />
        </svg>
      );
    case "register":
      return (
        <svg {...common}>
          <rect x="30" y="30" width="40" height="44" rx="4" fill="var(--bg2)" stroke="var(--blue)" strokeWidth="2" />
          <circle cx="50" cy="44" r="8" fill="var(--surface)" stroke="var(--muted)" strokeWidth="1.5" />
          <path d="M38 62h24" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "votes":
      return (
        <svg {...common}>
          <rect x="32" y="28" width="36" height="44" rx="3" fill="var(--surface)" stroke="var(--blue)" strokeWidth="2" />
          <path d="M40 44l6 6 14-14" stroke="var(--accent)" strokeWidth="3" fill="none" strokeLinecap="round" />
        </svg>
      );
    case "tally":
      return (
        <svg {...common}>
          <rect x="22" y="58" width="12" height="22" fill="var(--blue)" opacity="0.85" rx="2" />
          <rect x="42" y="42" width="12" height="38" fill="var(--accent)" opacity="0.9" rx="2" />
          <rect x="62" y="50" width="12" height="30" fill="var(--blue)" opacity="0.65" rx="2" />
        </svg>
      );
    case "double":
      return (
        <svg {...common}>
          <circle cx="50" cy="50" r="28" fill="rgba(201,48,44,0.12)" stroke="var(--accent)" strokeWidth="3" />
          <path d="M38 62L62 38" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

/** Fictional tickets — demonstration only, not a government election */
const electionTitle = "Demonstration ballot — fictional presidential preference (not a public election)";
const options = ["Avery / Chen", "Ramos / Patel", "Washington / Kim"];

export function GuidedDemo() {
  const [si, setSi] = useState(0);
  const step = STEPS[si];

  const electionAh = useMemo(() => fakeHash("USElection"), []);
  const voteA = useMemo(() => fakeHash("voteOH"), []);
  const voteB = useMemo(() => fakeHash("voteTX"), []);

  const tallies = [1, 0, 1];
  const doubleErr = 'Guest("this agent already voted in this election")';

  function next() {
    setSi((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    setSi((s) => Math.max(s - 1, 0));
  }
  function reset() {
    setSi(0);
  }

  const pulse = step.id === "sync" || step.id === "votes";

  return (
    <div
      style={{
        display: "grid",
        gap: "1.5rem",
        gridTemplateColumns: "minmax(0, 1fr) minmax(220px, 320px)",
        alignItems: "start",
      }}
      className="guided-grid"
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "1.25rem 1.5rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <h3 style={{ margin: 0, fontSize: "1.05rem" }}>Click-through story</h3>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#fff",
              background: "var(--accent)",
              padding: "4px 10px",
              borderRadius: 999,
            }}
          >
            {step.title}
          </span>
        </div>
        <div className="mono" style={{ fontSize: 11, color: "var(--muted)", margin: "0.35rem 0 0.75rem" }}>
          picture {si + 1} of {STEPS.length} — use Next / Back
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
          <div
            style={{
              background: "var(--bg2)",
              borderRadius: 16,
              border: "2px solid var(--blue)",
              padding: "0.5rem 1rem",
            }}
          >
            <StepPicture id={step.id} />
          </div>
        </div>

        <div
          style={{
            background: "rgba(46, 108, 173, 0.18)",
            border: "1px solid var(--blue)",
            borderRadius: 10,
            padding: "0.85rem 1rem",
            marginBottom: "0.75rem",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--blue)", letterSpacing: "0.04em", marginBottom: 6 }}>
            PLAIN SUMMARY (mechanics above are authoritative)
          </div>
          <p style={{ margin: 0, fontSize: 17, lineHeight: 1.5, fontWeight: 500 }}>{step.simple}</p>
        </div>

        <details style={{ marginBottom: "1rem" }}>
          <summary style={{ cursor: "pointer", color: "var(--muted)", fontSize: 14 }}>
            Zome / network wording
          </summary>
          <p style={{ color: "var(--muted)", margin: "0.5rem 0 0", fontSize: 14 }}>{step.caption}</p>
        </details>

        {step.id === "intro" && (
          <p style={{ margin: "0 0 1rem", fontSize: 15 }}>
            Press <strong>Next</strong> to move forward. You don’t need to know Holochain terms—just follow the pictures.
          </p>
        )}

        {step.id === "election" && (
          <div className="mono" style={{ fontSize: 12, background: "var(--bg2)", padding: 12, borderRadius: 8 }}>
            <div>
              <span style={{ color: "var(--muted)" }}>create_election</span> →{" "}
              <span style={{ color: "var(--accent)" }}>{electionAh}</span>
            </div>
            <div style={{ marginTop: 10, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {JSON.stringify({ title: electionTitle, options }, null, 2)}
            </div>
          </div>
        )}

        {step.id === "sync" && (
          <p style={{ margin: 0, fontSize: 14, color: "var(--muted)" }}>
            In automated tests we call <code className="mono">dhtSync</code> between conductors; in production, gossip
            keeps jurisdictions aligned.
          </p>
        )}

        {step.id === "register" && (
          <ul style={{ margin: 0, paddingLeft: "1.2rem", color: "var(--muted)", fontSize: 14 }}>
            <li>
              Voter A (Ohio): <span className="mono">register_voter(…)</span>
            </li>
            <li>
              Voter B (Texas): <span className="mono">register_voter(…)</span>
            </li>
          </ul>
        )}

        {step.id === "votes" && (
          <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: 15 }}>
            <li>
              Ohio → <strong>{options[0]}</strong>{" "}
              <span className="mono" style={{ color: "var(--muted)", fontSize: 12 }}>(receipt {voteA.slice(0, 16)}…)</span>
            </li>
            <li>
              Texas → <strong>{options[2]}</strong>{" "}
              <span className="mono" style={{ color: "var(--muted)", fontSize: 12 }}>(receipt {voteB.slice(0, 16)}…)</span>
            </li>
          </ul>
        )}

        {step.id === "tally" && (
          <div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              {options.map((o, i) => (
                <div
                  key={o}
                  style={{
                    flex: "1 1 100px",
                    background: "var(--bg2)",
                    borderRadius: 8,
                    padding: "8px 10px",
                    textAlign: "center",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.3 }}>{o}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "var(--blue)" }}>{tallies[i]}</div>
                </div>
              ))}
            </div>
            <div className="mono" style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.6 }}>
              vote receipts (hashes): [{voteA}, {voteB}]
            </div>
          </div>
        )}

        {step.id === "double" && (
          <div
            style={{
              background: "rgba(232, 93, 93, 0.12)",
              border: "1px solid var(--danger)",
              borderRadius: 8,
              padding: 12,
            }}
          >
            <strong style={{ color: "var(--danger)" }}>Nope — already voted</strong>
            <pre
              style={{
                margin: "8px 0 0",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                fontSize: 11,
              }}
              className="mono"
            >
              {doubleErr}
            </pre>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: "1.25rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={back}
            disabled={si === 0}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text)",
            }}
          >
            Back
          </button>
          <button
            type="button"
            onClick={next}
            disabled={si === STEPS.length - 1}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: "linear-gradient(135deg, var(--blue), var(--blue-dim))",
              color: "#fff",
              fontWeight: 600,
            }}
          >
            Next
          </button>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--bg2)",
              color: "var(--muted)",
            }}
          >
            Start over
          </button>
        </div>
      </div>

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "1rem",
          position: "sticky",
          top: "1rem",
        }}
      >
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>Map: states talking to each other</div>
        <NetworkDiagram pulse={pulse} />
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "12px 0 0", lineHeight: 1.45 }}>
          When the lines light up, imagine <strong>ballot info and votes traveling</strong> between places—not everything
          sitting in one warehouse.
        </p>
      </div>

      <style>{`
        @media (max-width: 820px) {
          .guided-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
