/**
 * Accurate Holochain mechanics for this voting hApp — not marketing claims.
 */

const block = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "1.1rem 1.25rem",
  marginBottom: "1rem",
};

export function MechanicsSection() {
  return (
    <section style={{ marginBottom: "2.5rem" }}>
      <h2 style={{ fontSize: "1.35rem", margin: "0 0 0.5rem" }}>How immutability, transparency, and accountability actually work</h2>
      <p style={{ color: "var(--muted)", margin: "0 0 1.25rem", fontSize: 15, maxWidth: 780, lineHeight: 1.55 }}>
        Below is what the conductor and peers <em>do</em> with data in this pattern—not slogans. This hApp uses the same
        primitives as other Holochain apps: source chains, validated writes, and DHT-held public data.
      </p>

      <article style={block}>
        <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.05rem", color: "var(--accent)" }}>
          1. Immutability = tamper‑evident history (not “nothing can ever change”)
        </h3>
        <ul style={{ margin: 0, paddingLeft: "1.2rem", color: "var(--muted)", fontSize: 14, lineHeight: 1.55 }}>
          <li style={{ marginBottom: 8 }}>
            Each agent has an <strong>append‑only source chain</strong>. New votes and registrations are{" "}
            <strong>Create</strong> actions: they are <strong>signed</strong> with that agent&apos;s key (Ed25519 in
            Holochain).
          </li>
          <li style={{ marginBottom: 8 }}>
            Every action has a <strong>cryptographic hash</strong> (action hash). The entry body is also hashed. If
            someone tried to rewrite an old vote in place, the hashes and signatures would no longer line up—peers reject
            inconsistent data.
          </li>
          <li>
            You can still author <strong>new</strong> actions later (e.g. another election). Immutability here means
            <strong> committed history is not silently editable</strong> without breaking the chain of hashes and
            signatures.
          </li>
        </ul>
      </article>

      <article style={block}>
        <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.05rem", color: "var(--accent)" }}>
          2. Validation = executable rules on every new write
        </h3>
        <ul style={{ margin: 0, paddingLeft: "1.2rem", color: "var(--muted)", fontSize: 14, lineHeight: 1.55 }}>
          <li style={{ marginBottom: 8 }}>
            The <strong>integrity zome</strong> defines <code className="mono">validate</code> callbacks. Before an entry
            is accepted, those rules run—for example: election must have a title and ≥2 options; a vote must point to an
            existing election action and use a legal choice index.
          </li>
          <li style={{ marginBottom: 8 }}>
            That is not “trust our server policy”: it is <strong>WASM shipped with the DNA</strong>, so every peer that
            cares runs the same checks on the same data shape.
          </li>
          <li>
            The <strong>coordinator zome</strong> in this hApp enforces <strong>one vote per agent</strong> before
            writing, by scanning existing ballot links. Integrity <code className="mono">validate</code> does not encode
            that rule—each published vote still has to pass the shared WASM checks (shape, election reference, legal
            choice). Production apps often duplicate critical invariants inside <code className="mono">validate</code>{" "}
            so peers reject bad publishes even if a client is patched.
          </li>
        </ul>
      </article>

      <article style={block}>
        <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.05rem", color: "var(--accent)" }}>
          3. Transparency = what you publish to the DHT, others can fetch and recount
        </h3>
        <ul style={{ margin: 0, paddingLeft: "1.2rem", color: "var(--muted)", fontSize: 14, lineHeight: 1.55 }}>
          <li style={{ marginBottom: 8 }}>
            Data that should be observable is written as <strong>public entries</strong> and (here) linked from the
            election entry with a <strong>Ballot</strong> link type. Those ops are <strong>gossiped</strong> on the
            distributed hash table (DHT) and held by peers.
          </li>
          <li style={{ marginBottom: 8 }}>
            <code className="mono">get_tally</code> walks those links, loads each vote entry, and sums counts. Any client
            with app access can run the same logic and should get the same result if they see the same graph of valid
            data.
          </li>
          <li>
            Returning <strong>sorted vote action hashes</strong> is deliberate: auditors can point to exact commits as
            receipts. What stays private (e.g. off‑chain MFA) is outside this chain—but the <strong>on‑chain</strong>{" "}
            part is inspectable.
          </li>
        </ul>
      </article>

      <article style={block}>
        <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.05rem", color: "var(--accent)" }}>
          4. Accountability = cryptographic provenance
        </h3>
        <ul style={{ margin: 0, paddingLeft: "1.2rem", color: "var(--muted)", fontSize: 14, lineHeight: 1.55 }}>
          <li style={{ marginBottom: 8 }}>
            Each Create action records an <strong>author</strong> (<code className="mono">AgentPubKey</code>). That ties
            a ballot entry to the key that signed it.
          </li>
          <li>
            Together with validation rules and link structure, you get: <strong>who</strong> committed what,{" "}
            <strong>when</strong> in their chain, and <strong>which hash</strong> identifies the action for third‑party
            audit.
          </li>
        </ul>
      </article>

      <article
        style={{
          ...block,
          marginBottom: 0,
          background: "var(--bg2)",
          borderStyle: "dashed",
        }}
      >
        <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem", color: "var(--text)" }}>What Holochain is not doing here</h3>
        <p style={{ margin: 0, fontSize: 14, color: "var(--muted)", lineHeight: 1.55 }}>
          There is no single global blockchain ordering every vote in one miner race. Agreement comes from{" "}
          <strong>many conductors</strong> each validating publishes against the <strong>same DNA rules</strong> and
          storing/sharing the resulting ops. That is why scaling and multi‑jurisdiction deployments look different from
          one monolithic chain or one central SQL tally.
        </p>
      </article>
    </section>
  );
}
