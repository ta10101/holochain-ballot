/**
 * Five steps tied to concrete Holochain mechanisms (short labels + mechanic line).
 */

function IconBallot() {
  return (
    <svg viewBox="0 0 64 64" width="72" height="72" aria-hidden>
      <rect x="14" y="8" width="36" height="48" rx="4" fill="var(--bg2)" stroke="var(--blue)" strokeWidth="2" />
      <path d="M22 20h20M22 28h16M22 36h20" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="44" cy="34" r="6" fill="var(--accent)" opacity="0.9" />
      <path d="M41 34l2 2 4-5" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function IconCopies() {
  return (
    <svg viewBox="0 0 64 64" width="72" height="72" aria-hidden>
      <rect x="10" y="18" width="28" height="34" rx="3" fill="var(--surface)" stroke="var(--border)" strokeWidth="2" />
      <rect x="18" y="10" width="28" height="34" rx="3" fill="var(--bg2)" stroke="var(--blue)" strokeWidth="2" />
      <rect x="26" y="4" width="28" height="34" rx="3" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2" />
      <path d="M32 22v8M28 26h8" stroke="var(--blue)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg viewBox="0 0 64 64" width="72" height="72" aria-hidden>
      <rect x="18" y="28" width="28" height="24" rx="3" fill="var(--bg2)" stroke="var(--blue)" strokeWidth="2" />
      <path
        d="M24 28V22a8 8 0 1116 0v6"
        fill="none"
        stroke="var(--blue)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="32" cy="40" r="3" fill="var(--accent)" />
    </svg>
  );
}

function IconEye() {
  return (
    <svg viewBox="0 0 64 64" width="72" height="72" aria-hidden>
      <ellipse cx="32" cy="32" rx="22" ry="14" fill="none" stroke="var(--blue)" strokeWidth="2" />
      <circle cx="32" cy="32" r="8" fill="var(--bg2)" stroke="var(--accent)" strokeWidth="2" />
      <circle cx="32" cy="32" r="3" fill="var(--accent)" />
    </svg>
  );
}

function IconStop() {
  return (
    <svg viewBox="0 0 64 64" width="72" height="72" aria-hidden>
      <circle cx="32" cy="32" r="22" fill="rgba(201,48,44,0.15)" stroke="var(--accent)" strokeWidth="3" />
      <path d="M24 40L40 24" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

const STEPS = [
  {
    label: "Election entry",
    mechanic: "Signed Create on the author’s source chain; entry bytes hashed.",
    Icon: IconBallot,
  },
  {
    label: "DHT publish",
    mechanic: "Public ops gossiped; peers store what validation accepts.",
    Icon: IconCopies,
  },
  {
    label: "Vote signed",
    mechanic: "Another Create, same chain rules + integrity validate().",
    Icon: IconLock,
  },
  {
    label: "Links = index",
    mechanic: "Ballot links from election → vote entries for queries / tally.",
    Icon: IconEye,
  },
  {
    label: "One author, one vote",
    mechanic: "Coordinator checks links; duplicate rejected before write.",
    Icon: IconStop,
  },
];

export function SimpleStory() {
  return (
    <section
      style={{
        background: "linear-gradient(180deg, rgba(46, 108, 173, 0.12) 0%, var(--surface) 100%)",
        border: "2px solid var(--blue)",
        borderRadius: 16,
        padding: "1.5rem 1.25rem 1.75rem",
        marginBottom: "2rem",
      }}
    >
      <h2 style={{ margin: "0 0 0.35rem", fontSize: "1.35rem", textAlign: "center" }}>
        Same story, Holochain primitives
      </h2>
      <p
        style={{
          margin: "0 0 1.5rem",
          textAlign: "center",
          color: "var(--muted)",
          fontSize: 15,
          maxWidth: 640,
          marginLeft: "auto",
          marginRight: "auto",
          lineHeight: 1.5,
        }}
      >
        Each step names a <strong>mechanism</strong>. Try the{" "}
        <a href="#interactive-vote-lab" style={{ color: "inherit", fontWeight: 600 }}>
          interactive lab
        </a>{" "}
        (four voters, Red/Blue), then read{" "}
        <a href="#mechanics-deep-dive" style={{ color: "inherit", fontWeight: 600 }}>
          the deep dive
        </a>
        .
      </p>

      <div
        className="simple-story-strip"
        style={{
          display: "flex",
          gap: "1rem",
          overflowX: "auto",
          paddingBottom: 8,
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {STEPS.map((s, i) => (
          <div
            key={s.label}
            style={{
              flex: "0 0 min(200px, 85vw)",
              scrollSnapAlign: "start",
              background: "var(--bg2)",
              borderRadius: 12,
              border: "1px solid var(--border)",
              padding: "1rem",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                margin: "0 auto 0.5rem",
                borderRadius: "50%",
                background: "var(--surface)",
                border: "2px solid var(--blue)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 18,
                color: "var(--accent)",
              }}
            >
              {i + 1}
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
              <s.Icon />
            </div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: "var(--text)" }}>{s.label}</div>
            <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", lineHeight: 1.45 }}>{s.mechanic}</p>
          </div>
        ))}
      </div>

      <style>{`
        @media (min-width: 900px) {
          .simple-story-strip {
            display: grid !important;
            grid-template-columns: repeat(5, 1fr);
            overflow-x: visible !important;
          }
          .simple-story-strip > div {
            flex: unset !important;
            min-width: 0 !important;
          }
        }
      `}</style>
    </section>
  );
}
