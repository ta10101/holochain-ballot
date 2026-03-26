import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const ELECTION_TITLE = "Showcase election — Red vs Blue";

/** Deterministic fake Holochain-style hashes for the lab */
function fakeHash(parts) {
  const s = Array.isArray(parts) ? parts.join("|") : String(parts);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  const hex = Math.abs(h).toString(16).padStart(8, "0");
  const tail = [...s].slice(-4).map((c) => c.charCodeAt(0).toString(16)).join("");
  return `uhCkk${hex}${tail}`.slice(0, 18) + "…";
}

const VOTERS = [
  { id: "a", name: "Alex", pubkey: fakeHash("agent|Alex") },
  { id: "b", name: "Blake", pubkey: fakeHash("agent|Blake") },
  { id: "c", name: "Casey", pubkey: fakeHash("agent|Casey") },
  { id: "d", name: "Dana", pubkey: fakeHash("agent|Dana") },
];

const OPTIONS = [
  { label: "Red", index: 0, color: "#c9302c" },
  { label: "Blue", index: 1, color: "#2e6cad" },
];

function initialState() {
  const electionAh = fakeHash("election|create");
  const electionEh = fakeHash("entry|election|" + electionAh);
  return {
    electionAh,
    electionEh,
    votes: [],
    /** per agent: list of { kind, hash, detail } */
    chains: Object.fromEntries(VOTERS.map((v) => [v.id, []])),
    logEntries: [],
  };
}

export function InteractiveVoteLab() {
  const [state, setState] = useState(initialState);
  const [lastError, setLastError] = useState(null);
  const introDone = useRef(false);

  const reset = useCallback(() => {
    const next = initialState();
    setState({
      ...next,
      logEntries: [
        {
          t: Date.now(),
          lines: [
            "Lab reset.",
            `▸ Election already on the DHT: ActionHash ${next.electionAh}, options [Red=0, Blue=1].`,
            "▸ Pick a voter and a color to run cast_vote and append the log.",
          ],
        },
      ],
    });
    setLastError(null);
  }, []);

  useEffect(() => {
    if (introDone.current) return;
    introDone.current = true;
    const s = initialState();
    setState({
      ...s,
      logEntries: [
        {
          t: Date.now(),
          lines: [
            `▸ Assume create_election already completed → ActionHash ${s.electionAh}`,
            `▸ Entry hash for Ballot links: ${s.electionEh}`,
            "▸ When you vote, the coordinator runs get_links → duplicate scan → create_entry → create_link.",
          ],
        },
      ],
    });
  }, []);

  const tryVote = useCallback(
    (voterId, choiceIndex) => {
      setLastError(null);
      const voter = VOTERS.find((v) => v.id === voterId);
      if (!voter) return;

      const lines = [];
      const add = (s) => lines.push(s);

      add(`▸ zome call: cast_vote({ election_action: ${state.electionAh}, choice_index: ${choiceIndex} })`);
      add(`   author (AgentPubKey): ${voter.pubkey}`);
      add(`▸ coordinator: must_get_valid_record(election_action) → OK (Election entry present)`);
      add(`▸ coordinator: entry_hash_from_record → election entry hash ${state.electionEh}`);

      const existing = state.votes.find((x) => x.voterId === voterId);
      add(`▸ get_links(LinkQuery::new(${state.electionEh}, LinkTypes::Ballot)) → ${state.votes.length} Ballot link(s)`);

      if (existing) {
        add(`▸ for each link target: load vote record, read Create.author`);
        add(`   match: existing vote by same author → REJECT before create_entry`);
        add(`▸ WasmError::Guest("this agent already voted in this election")`);
        setState((prev) => ({
          ...prev,
          logEntries: [...prev.logEntries, { t: Date.now(), lines }],
        }));
        setLastError({ voterId, message: 'Guest("this agent already voted in this election")' });
        return;
      }

      add(`▸ duplicate scan: no prior Ballot-linked vote from this author → OK`);

      const voteAh = fakeHash(["vote", voterId, String(state.votes.length), String(choiceIndex)]);
      const voteEh = fakeHash(["entry", "vote", voteAh]);
      const voteBody = {
        election_action: state.electionAh,
        choice_index: choiceIndex,
      };

      add(`▸ create_entry(EntryTypes::Vote(${JSON.stringify(voteBody)}))`);
      add(`   → signed Create on ${voter.name}'s source chain; action hash ${voteAh}`);
      add(`   → integrity validate(): election exists, choice_index in range → Valid`);
      add(`▸ create_link(${state.electionEh} → ${voteEh}, LinkTypes::Ballot)`);
      add(`   → public Ballot link (election entry → vote entry) for DHT gossip / tally`);

      setState((prev) => {
        const vote = { voterId, choiceIndex, voteAh, voteEh };
        const chainEntry = {
          kind: "Vote",
          hash: voteAh,
          detail: `${OPTIONS[choiceIndex].label} (choice_index=${choiceIndex})`,
        };
        return {
          ...prev,
          votes: [...prev.votes, vote],
          chains: {
            ...prev.chains,
            [voterId]: [...(prev.chains[voterId] || []), chainEntry],
          },
          logEntries: [...prev.logEntries, { t: Date.now(), lines }],
        };
      });
    },
    [state.electionAh, state.electionEh, state.votes]
  );

  const counts = useMemo(() => {
    const c = [0, 0];
    for (const v of state.votes) {
      if (v.choiceIndex >= 0 && v.choiceIndex < c.length) c[v.choiceIndex] += 1;
    }
    return c;
  }, [state.votes]);

  const sortedReceipts = useMemo(() => {
    return [...state.votes].sort((a, b) => a.voteAh.localeCompare(b.voteAh)).map((v) => v.voteAh);
  }, [state.votes]);

  return (
    <section
      style={{
        marginBottom: "2.5rem",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: "1.25rem 1.25rem 1.5rem",
      }}
      id="interactive-vote-lab"
    >
      <h2 style={{ fontSize: "1.2rem", margin: "0 0 0.35rem" }}>Interactive lab: four people, Red or Blue</h2>
      <p style={{ color: "var(--muted)", margin: "0 0 1.25rem", fontSize: 14, maxWidth: 820, lineHeight: 1.55 }}>
        Click <strong>Red</strong> or <strong>Blue</strong> for each voter. The right column replays what the{" "}
        <code className="mono">voting</code> coordinator does (same order as{" "}
        <code className="mono">dnas/voting/zomes/coordinator/voting/src/lib.rs</code>). After someone has voted, use{" "}
        <strong>Try second vote</strong> to see the duplicate rejection. This is a browser simulation, not a live
        conductor.
      </p>

      <div
        style={{
          display: "grid",
          gap: "1.25rem",
          gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 1fr)",
          alignItems: "start",
        }}
        className="vote-lab-grid"
      >
        {/* Left: election + voters */}
        <div>
          <div
            style={{
              background: "var(--bg2)",
              border: "1px solid var(--blue)",
              borderRadius: 12,
              padding: "1rem 1.1rem",
              marginBottom: "1rem",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--blue)", letterSpacing: "0.06em", marginBottom: 6 }}>
              ELECTION ENTRY (public, DHT)
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{ELECTION_TITLE}</div>
            <div className="mono" style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.6 }}>
              <div>
                create_election → <span style={{ color: "var(--accent)" }}>ActionHash</span> {state.electionAh}
              </div>
              <div>
                entry hash (for links): <span style={{ color: "var(--accent)" }}>EntryHash</span> {state.electionEh}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              {OPTIONS.map((o) => (
                <div
                  key={o.label}
                  style={{
                    flex: "1 1 80px",
                    textAlign: "center",
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: `2px solid ${o.color}`,
                    background: "var(--surface)",
                  }}
                >
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{o.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: o.color }}>{counts[o.index]}</div>
                </div>
              ))}
            </div>
            {state.votes.length > 0 && (
              <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 10, lineHeight: 1.5 }}>
                get_tally-style receipts (sorted): [{sortedReceipts.join(", ")}]
              </div>
            )}
          </div>

          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 8 }}>Voters (each has their own source chain)</div>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
            {VOTERS.map((v) => {
              const voted = state.votes.find((x) => x.voterId === v.id);
              return (
                <div
                  key={v.id}
                  style={{
                    background: "var(--bg2)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: "0.85rem 1rem",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{v.name}</div>
                  <div className="mono" style={{ fontSize: 9, color: "var(--muted)", wordBreak: "break-all", marginBottom: 10 }}>
                    {v.pubkey}
                  </div>
                  {!voted ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      {OPTIONS.map((o) => (
                        <button
                          key={o.label}
                          type="button"
                          onClick={() => tryVote(v.id, o.index)}
                          style={{
                            flex: 1,
                            padding: "10px 8px",
                            borderRadius: 8,
                            border: `2px solid ${o.color}`,
                            background: `linear-gradient(180deg, ${o.color}22, var(--surface))`,
                            color: "var(--text)",
                            fontWeight: 700,
                            fontSize: 13,
                          }}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 13, marginBottom: 8 }}>
                        Voted <strong style={{ color: OPTIONS[voted.choiceIndex].color }}>{OPTIONS[voted.choiceIndex].label}</strong>
                        <span className="mono" style={{ fontSize: 10, color: "var(--muted)", display: "block", marginTop: 4 }}>
                          receipt {voted.voteAh}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => tryVote(v.id, 1 - voted.choiceIndex)}
                        style={{
                          width: "100%",
                          padding: "8px 10px",
                          borderRadius: 8,
                          border: "1px solid var(--danger)",
                          background: "rgba(232, 93, 93, 0.12)",
                          color: "var(--danger)",
                          fontWeight: 600,
                          fontSize: 12,
                        }}
                      >
                        Try second vote (should fail)
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1rem",
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--muted)",
              fontSize: 13,
            }}
          >
            Reset lab
          </button>
        </div>

        {/* Right: behind the scenes */}
        <div
          style={{
            position: "sticky",
            top: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            minHeight: 200,
          }}
        >
          <div
            style={{
              background: "var(--bg2)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "0.85rem 1rem",
              maxHeight: 340,
              overflow: "auto",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.05em", marginBottom: 8 }}>
              PROCEDURE LOG (last call on top)
            </div>
            {state.logEntries.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>Vote once to see coordinator steps here.</p>
            ) : (
              [...state.logEntries].reverse().map((block, i) => (
                <pre
                  key={block.t + "-" + i}
                  className="mono"
                  style={{
                    margin: i === 0 ? "0 0 12px" : "0 0 16px",
                    paddingBottom: i === state.logEntries.length - 1 ? 0 : 12,
                    borderBottom: i === state.logEntries.length - 1 ? "none" : "1px dashed var(--border)",
                    fontSize: 10,
                    lineHeight: 1.55,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    color: "var(--text)",
                  }}
                >
                  {block.lines.join("\n")}
                </pre>
              ))
            )}
          </div>

          {lastError && (
            <div
              style={{
                background: "rgba(232, 93, 93, 0.12)",
                border: "1px solid var(--danger)",
                borderRadius: 10,
                padding: "0.75rem 1rem",
              }}
            >
              <div style={{ fontWeight: 700, color: "var(--danger)", fontSize: 13, marginBottom: 6 }}>Coordinator rejected</div>
              <code className="mono" style={{ fontSize: 11, wordBreak: "break-all" }}>
                {lastError.message}
              </code>
            </div>
          )}

          <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: "0.85rem 1rem" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--blue)", letterSpacing: "0.05em", marginBottom: 10 }}>
              WHERE DATA LIVES (conceptual)
            </div>
            <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: 12, color: "var(--muted)", lineHeight: 1.55 }}>
              <li style={{ marginBottom: 6 }}>
                <strong style={{ color: "var(--text)" }}>Each voter&apos;s source chain:</strong> their signed Create actions
                (here, only the Vote create shows per person).
              </li>
              <li style={{ marginBottom: 6 }}>
                <strong style={{ color: "var(--text)" }}>DHT:</strong> published election + vote entries and Ballot links are
                what peers gossip and hold; tally walks those links like <code className="mono">get_tally</code>.
              </li>
            </ul>
            <div style={{ marginTop: 12, fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>Source chain tips</div>
            <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
              {VOTERS.map((v) => {
                const tip = state.chains[v.id] || [];
                const last = tip[tip.length - 1];
                return (
                  <div
                    key={v.id}
                    className="mono"
                    style={{
                      fontSize: 10,
                      padding: "6px 8px",
                      background: "var(--surface)",
                      borderRadius: 6,
                      border: "1px solid var(--border)",
                    }}
                  >
                    <span style={{ color: "var(--blue)" }}>{v.name}</span>
                    {last ? (
                      <>
                        {" → "}
                        <span style={{ color: "var(--accent)" }}>{last.kind}</span> {last.hash}
                        <span style={{ color: "var(--muted)" }}> ({last.detail})</span>
                      </>
                    ) : (
                      <span style={{ color: "var(--muted)" }}> — no vote yet</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .vote-lab-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
