# Secret ballot research note (P5.1)

This is a **research-only** note for high-stakes/secret-ballot directions.  
It is **not** an implementation plan for the current transparent `holochain-ballot` DNA.

See scope guardrails in [SCOPE.md](SCOPE.md) (including the **P5.2 go/no-go** decision for secret-ballot DNA in this repo) and threat assumptions in [THREAT_MODEL.md](THREAT_MODEL.md).

## Why this is a separate track

Current DNA intentionally optimizes for transparent, auditable tallies:

- votes are regular entries
- ballots are discoverable through links
- tally is recomputed by scanning link targets

Those properties are useful for demo/pilot auditability, but conflict with strong secret-ballot goals.

## Desired properties for a secret-ballot system

At minimum:

1. **Ballot secrecy**: no one can link voter identity to vote choice.
2. **Eligibility**: only authorized voters cast valid ballots.
3. **Uniqueness**: one ballot per eligible voter.
4. **Verifiability**:
   - individual (voter can verify inclusion)
   - universal (anyone can verify tally correctness)
5. **Robustness/coercion resistance** (depending on jurisdiction requirements).

These goals often conflict; design decisions are trade-offs, not free upgrades.

## Candidate directions (high level)

### A) End-to-end verifiable cryptographic elections (mixnets / homomorphic tally)

Typical pattern:

- voters encrypt ballots with election public key
- zero-knowledge proofs validate ballot well-formedness
- tally is computed by mix/decrypt protocol or homomorphic aggregation with proofs

Pros:

- strongest known public verifiability + secrecy story

Cons:

- significantly higher complexity and audit burden
- hard UX and operational requirements (key ceremonies, trustees)

Relevance to Holochain:

- possible as a **new protocol layer** where DHT stores ciphertexts/proofs and public bulletin metadata
- not compatible with current plain vote-entry tally path

### B) Blind-signature / anonymous credential based voting

Typical pattern:

- issuer validates eligibility
- voter obtains unlinkable voting credential/token
- credential is spent once when casting encrypted/anonymous ballot

Pros:

- separates eligibility verification from vote identity

Cons:

- revocation/double-spend handling and anti-coercion are non-trivial
- requires careful issuer trust model and crypto proofs

Relevance to Holochain:

- could fit as credential issuance + spend records in DHT
- still requires a redesigned tally/validation protocol

### C) Trusted hardware / trusted execution assisted secrecy

Typical pattern:

- use TEEs/HSM-backed services to protect vote secrecy and tally integrity

Pros:

- simpler than full cryptographic verifiability in some deployments

Cons:

- shifts trust to hardware vendors/attestation chain
- weaker “trust minimization” than pure cryptographic protocols

Relevance:

- may be acceptable for some org pilots, but not equivalent to strong E2E public verifiability.

## Fit with Holochain constraints

Holochain provides:

- signed source-chain actions
- validation callbacks
- DHT replication

Holochain does **not** by itself provide:

- anonymous credential systems
- homomorphic tally/decryption protocols
- coercion resistance

Therefore, a secret-ballot path should be treated as:

- a **new DNA version or fork**
- with new entry/link semantics and validation rules
- likely external cryptographic components and independent review

## Recommendation (current repo)

For `holochain-ballot`:

1. Keep current transparent track as-is for community/org pilots.
2. Do **not** silently retrofit secret ballot into current DNA.
3. If secret ballot is pursued, open a dedicated design track with:
   - explicit threat model update
   - formal cryptographic protocol selection
   - external review plan

This maps to roadmap **P5.2** (decision recorded in [SCOPE.md](SCOPE.md)) and **P5.3** (only if scope becomes **GO**; **N/A** while **NO-GO**).

## Go/no-go criteria (used for the P5.2 decision; reference)

A “go” decision should require all of:

- clear target context (what election class, what legal regime)
- named adversary model (coercion, collusion, endpoint compromise)
- protocol with published security rationale
- implementation budget for audits and operations
- explicit acceptance that this is a **new product track**, not a patch

Without these, recommendation is **no-go** for secret-ballot implementation in this repo.

## References (starting points)

- Benaloh et al., *End-to-End Verifiability* (overview): [https://www.usenix.org/conference/evtwote11/end-end-verifiability](https://www.usenix.org/conference/evtwote11/end-end-verifiability)
- Adida, *Helios: Web-based Open-Audit Voting*: [https://www.usenix.org/legacy/event/sec08/tech/full_papers/adida/adida.pdf](https://www.usenix.org/legacy/event/sec08/tech/full_papers/adida/adida.pdf)
- CIVS (Condorcet Internet Voting Service) discussion of trust model trade-offs: [https://civs.cs.columbia.edu/](https://civs.cs.columbia.edu/)
- NIST election cybersecurity publications portal: [https://www.nist.gov/itl/voting](https://www.nist.gov/itl/voting)

These references are directional only; selecting a protocol requires a dedicated security review process.
