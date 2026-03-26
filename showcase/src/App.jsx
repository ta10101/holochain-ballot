import { GuidedDemo } from "./GuidedDemo.jsx";
import { InteractiveVoteLab } from "./InteractiveVoteLab.jsx";
import { MechanicsSection } from "./MechanicsSection.jsx";
import { SimpleStory } from "./SimpleStory.jsx";

export default function App() {
  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", padding: "2rem 1.25rem 4rem" }}>
      <div
        style={{
          background: "rgba(46, 108, 173, 0.14)",
          border: "1px solid rgba(46, 108, 173, 0.4)",
          borderRadius: 10,
          padding: "0.65rem 1rem",
          marginBottom: "1rem",
          fontSize: 13,
          color: "var(--muted)",
        }}
      >
        <strong style={{ color: "var(--text)" }}>Live DNA demo (Tryorama in the browser).</strong> With Docker, run{" "}
        <code className="mono" style={{ color: "var(--text)" }}>
          npm run demo:dashboard
        </code>{" "}
        and open{" "}
        <a href="http://localhost:3456/" style={{ color: "var(--blue)" }}>
          http://localhost:3456/
        </a>
        . Default run uses four conductors and the same voter names as the lab below (Alex, Blake, Casey, Dana). This
        page is static; the dashboard streams a real packaged <code className="mono">.happ</code>.{" "}
        <strong>Not</strong> for government or binding public elections—see repo <code className="mono">docs/SCOPE.md</code>.
      </div>

      <div
        style={{
          background: "rgba(201, 48, 44, 0.12)",
          border: "1px solid rgba(201, 48, 44, 0.35)",
          borderRadius: 10,
          padding: "0.65rem 1rem",
          marginBottom: "1.25rem",
          fontSize: 13,
          color: "var(--muted)",
        }}
      >
        <strong style={{ color: "var(--text)" }}>Technical showcase.</strong> Fictional U.S.-style story for teaching—not
        an official or certified voting system. Describes Holochain behavior for the{" "}
        <code className="mono">holochain-ballot</code> hApp. Runnable checks:{" "}
        <code className="mono" style={{ color: "var(--text)" }}>
          npm run docker:test
        </code>
        .
      </div>

      <header style={{ marginBottom: "1.75rem" }} id="top">
        <p
          style={{
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontSize: 11,
            color: "var(--blue)",
            margin: "0 0 0.5rem",
            fontWeight: 600,
          }}
        >
          holochain-ballot · reference UI
        </p>
        <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2.1rem)", fontWeight: 700, margin: "0 0 0.75rem", lineHeight: 1.2 }}>
          Voting on Holochain: mechanics of immutability, transparency, and accountability
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "1.05rem", maxWidth: 780, margin: 0, lineHeight: 1.55 }}>
          This page documents <strong>what actually happens</strong> when this hApp creates elections, registrations,
          and votes: signed source-chain actions, integrity validation, DHT replication of published data, and tallying
          from links. Use it alongside the Rust zomes in <code className="mono">dnas/voting/</code>.
        </p>
      </header>

      <SimpleStory />

      <InteractiveVoteLab />

      <div id="mechanics-deep-dive">
        <MechanicsSection />
      </div>

      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ fontSize: "1.2rem", margin: "0 0 0.75rem" }}>Rules enforced in this hApp (integrity + coordinator)</h2>
        <ul style={{ color: "var(--text)", margin: 0, paddingLeft: "1.2rem", maxWidth: 780, fontSize: 15, lineHeight: 1.55 }}>
          <li style={{ marginBottom: 8 }}>
            <strong>Integrity zome:</strong> election title non-empty, ≥2 non-empty options, caps on title length,
            option count, and option string length; vote must reference a stored election and use a valid choice index;
            registration must reference an existing election action.
          </li>
          <li style={{ marginBottom: 8 }}>
            <strong>Coordinator zome:</strong> requires a <code className="mono">VoterRegistration</code> link from the
            election for this agent before <code className="mono">cast_vote</code>; rejects duplicate{" "}
            <code className="mono">register_voter</code> for the same agent; before creating a vote, scans{" "}
            <code className="mono">Ballot</code> links and rejects if this agent already has a vote linked.
          </li>
          <li>
            <strong>Tally:</strong> <code className="mono">get_links</code> on the election entry hash, deserialize each
            vote, sum by choice, return sorted vote action hashes for audit.
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ fontSize: "1.2rem", margin: "0 0 0.25rem" }}>Step-through (mock ballot + UI narration)</h2>
        <p style={{ color: "var(--muted)", margin: "0 0 1rem", fontSize: 15 }}>
          Mirrors zome calls <code className="mono">create_election</code>, <code className="mono">register_voter</code>,{" "}
          <code className="mono">cast_vote</code>, <code className="mono">get_tally</code>. Plain-language panel + optional
          technical details per step.
        </p>
        <GuidedDemo />
      </section>

      <details
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "1rem 1.25rem",
        }}
      >
        <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 15 }}>
          Running a live conductor &amp; automated tests
        </summary>
        <p style={{ color: "var(--muted)", margin: "0.75rem 0", fontSize: 14 }}>
          Browser clients need an app auth token and zome-call signing (see{" "}
          <a href="https://github.com/holochain/holochain-client-js" target="_blank" rel="noreferrer">
            holochain-client-js
          </a>
          ). Launcher streamlines that; otherwise use admin API once for signing credentials, then AppWebsocket with an
          issued token.
        </p>
        <p style={{ color: "var(--muted)", margin: 0, fontSize: 14 }}>
          <strong>Tryorama (two peers, DHT sync):</strong>{" "}
          <code className="mono" style={{ color: "var(--text)" }}>
            npm run docker:build:happ && npm run docker:test
          </code>
        </p>
      </details>

      <footer style={{ marginTop: "2.5rem", fontSize: 12, color: "var(--muted)" }}>
        Showcase UI · Holochain 0.6 line ·{" "}
        <a href="https://developer.holochain.org" target="_blank" rel="noreferrer">
          developer.holochain.org
        </a>
      </footer>
    </div>
  );
}
