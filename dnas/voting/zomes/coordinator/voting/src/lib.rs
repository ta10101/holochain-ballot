//! Coordinator zome: create election, register, cast vote, tally.

use hdk::prelude::*;
use voting_integrity::{
    Election, ElectionPhase, EntryTypes, LinkTypes, Registration, Vote, MAX_ALLOWLIST_VOTERS,
    MAX_ELECTION_OPTIONS, MAX_ELECTION_REGISTRATIONS_CAP, MAX_ELECTION_TITLE_BYTES,
    MAX_OPTION_TEXT_BYTES,
};

fn entry_hash_from_record(rec: &Record) -> ExternResult<EntryHash> {
    match rec.action() {
        Action::Create(c) => Ok(c.entry_hash.clone()),
        Action::Update(u) => Ok(u.entry_hash.clone()),
        _ => Err(wasm_error!(WasmErrorInner::Guest(
            "expected Create or Update action".into()
        ))),
    }
}

fn require_election_create_shape(rec: &Record) -> ExternResult<()> {
    if !matches!(rec.action(), Action::Create(_)) {
        return Err(wasm_error!(WasmErrorInner::Guest(
            "election_action must be the election create action hash".into(),
        )));
    }
    let _: Election = rec
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(WasmErrorInner::Guest(e.to_string())))?
        .ok_or_else(|| wasm_error!(WasmErrorInner::Guest("election entry missing".into())))?;
    Ok(())
}

/// Walk the creator's update chain from the create action to the newest [`Election`] state.
fn get_latest_election_for_create(create_ah: ActionHash) -> ExternResult<(ActionHash, Election)> {
    let create_rec = must_get_valid_record(create_ah.clone())?;
    require_election_create_shape(&create_rec)?;
    let creator = create_rec.action().author().clone();
    let mut cur_ah = create_ah;
    let mut cur_rec = create_rec;
    loop {
        let details = match get_details(cur_ah.clone(), GetOptions::network())? {
            Some(Details::Record(r)) => r,
            _ => {
                return Err(wasm_error!(WasmErrorInner::Guest(
                    "election metadata not found".into(),
                )))
            }
        };
        let mut best_next: Option<ActionHash> = None;
        for u in &details.updates {
            let u_ah = u.action_address().clone();
            let Some(u_rec) = get(u_ah.clone(), GetOptions::network())? else {
                continue;
            };
            if u_rec.action().author() != &creator {
                continue;
            }
            let election: Option<Election> = u_rec
                .entry()
                .to_app_option()
                .map_err(|e| wasm_error!(WasmErrorInner::Guest(e.to_string())))?;
            if election.is_none() {
                continue;
            }
            best_next = Some(match best_next {
                None => u_ah,
                Some(b) => {
                    if u_ah.get_raw_32() > b.get_raw_32() {
                        u_ah
                    } else {
                        b
                    }
                }
            });
        }
        if let Some(next) = best_next {
            cur_ah = next;
            cur_rec = must_get_valid_record(cur_ah.clone())?;
            continue;
        }
        break;
    }
    let election: Election = cur_rec
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(WasmErrorInner::Guest(e.to_string())))?
        .ok_or_else(|| wasm_error!(WasmErrorInner::Guest("election entry missing".into())))?;
    Ok((cur_ah, election))
}

fn phase_allows_registration(phase: &ElectionPhase) -> bool {
    matches!(
        phase,
        ElectionPhase::Active | ElectionPhase::OpenRegistration
    )
}

fn phase_allows_voting(phase: &ElectionPhase) -> bool {
    matches!(
        phase,
        ElectionPhase::Active | ElectionPhase::OpenVoting
    )
}

fn count_distinct_registrants(election_eh: EntryHash) -> ExternResult<usize> {
    let links = get_links(
        LinkQuery::try_new(election_eh, LinkTypes::VoterRegistration)?,
        GetStrategy::default(),
    )?;
    let mut authors: Vec<AgentPubKey> = Vec::new();
    for link in links {
        if let Some(reg_eh) = link.target.into_entry_hash() {
            if let Some(reg_rec) = get(reg_eh, GetOptions::network())? {
                let a = reg_rec.action().author().clone();
                if !authors.iter().any(|k| k == &a) {
                    authors.push(a);
                }
            }
        }
    }
    Ok(authors.len())
}

fn valid_phase_transition(from: &ElectionPhase, to: &ElectionPhase) -> bool {
    use ElectionPhase::*;
    matches!(
        (from, to),
        (Draft, OpenRegistration)
            | (OpenRegistration, OpenVoting)
            | (OpenVoting, Closed)
            | (Active, Closed)
    )
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateElectionInput {
    pub title: String,
    pub options: Vec<String>,
    #[serde(default)]
    pub phase: ElectionPhase,
    #[serde(default)]
    pub allowed_voters: Option<Vec<AgentPubKey>>,
    #[serde(default)]
    pub max_registrations: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CastVoteInput {
    pub election_action: ActionHash,
    pub choice_index: u32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AdvanceElectionPhaseInput {
    pub election_create_action: ActionHash,
    pub expected_phase: ElectionPhase,
    pub next_phase: ElectionPhase,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TallyOutput {
    pub title: String,
    pub options: Vec<String>,
    pub counts: Vec<u32>,
    pub vote_action_hashes: Vec<ActionHash>,
}

#[hdk_extern]
fn create_election(input: CreateElectionInput) -> ExternResult<ActionHash> {
    if input.title.trim().is_empty() || input.options.len() < 2 {
        return Err(wasm_error!(WasmErrorInner::Guest(
            "election needs a title and at least two options".into(),
        )));
    }
    if input.title.len() > MAX_ELECTION_TITLE_BYTES {
        return Err(wasm_error!(WasmErrorInner::Guest(
            "election title too long".into(),
        )));
    }
    if input.options.len() > MAX_ELECTION_OPTIONS {
        return Err(wasm_error!(WasmErrorInner::Guest(
            "too many election options".into(),
        )));
    }
    if input.options.iter().any(|o| o.trim().is_empty()) {
        return Err(wasm_error!(WasmErrorInner::Guest(
            "election options must be non-empty".into(),
        )));
    }
    if input
        .options
        .iter()
        .any(|o| o.len() > MAX_OPTION_TEXT_BYTES)
    {
        return Err(wasm_error!(WasmErrorInner::Guest(
            "an election option is too long".into(),
        )));
    }
    if let Some(ref keys) = input.allowed_voters {
        if keys.len() > MAX_ALLOWLIST_VOTERS {
            return Err(wasm_error!(WasmErrorInner::Guest(
                "allowed_voters list too large".into(),
            )));
        }
    }
    if let Some(n) = input.max_registrations {
        if n < 1 {
            return Err(wasm_error!(WasmErrorInner::Guest(
                "max_registrations must be at least 1 when set".into(),
            )));
        }
        if n > MAX_ELECTION_REGISTRATIONS_CAP {
            return Err(wasm_error!(WasmErrorInner::Guest(
                "max_registrations exceeds cap".into(),
            )));
        }
    }
    let election = Election {
        title: input.title,
        options: input.options,
        phase: input.phase,
        allowed_voters: input.allowed_voters,
        max_registrations: input.max_registrations,
    };
    create_entry(EntryTypes::Election(election))
}

#[hdk_extern]
fn advance_election_phase(input: AdvanceElectionPhaseInput) -> ExternResult<ActionHash> {
    let create_rec = must_get_valid_record(input.election_create_action.clone())?;
    require_election_create_shape(&create_rec)?;
    let creator = create_rec.action().author().clone();
    let me = agent_info()?.agent_initial_pubkey;
    if me != creator {
        return Err(wasm_error!(WasmErrorInner::Guest(
            "only the election creator may change phase".into(),
        )));
    }
    let (latest_ah, election) =
        get_latest_election_for_create(input.election_create_action.clone())?;
    if election.phase != input.expected_phase {
        return Err(wasm_error!(WasmErrorInner::Guest(
            "election phase has changed; refresh expected_phase".into(),
        )));
    }
    if !valid_phase_transition(&election.phase, &input.next_phase) {
        return Err(wasm_error!(WasmErrorInner::Guest(
            "invalid election phase transition".into(),
        )));
    }
    let updated = Election {
        title: election.title,
        options: election.options,
        phase: input.next_phase,
        allowed_voters: election.allowed_voters,
        max_registrations: election.max_registrations,
    };
    update_entry(latest_ah, EntryTypes::Election(updated))
}

#[hdk_extern]
fn register_voter(election_action: ActionHash) -> ExternResult<()> {
    let create_rec = must_get_valid_record(election_action.clone())?;
    require_election_create_shape(&create_rec)?;
    let election_eh = entry_hash_from_record(&create_rec)?;
    let (_, election) = get_latest_election_for_create(election_action.clone())?;

    if !phase_allows_registration(&election.phase) {
        return Err(wasm_error!(WasmErrorInner::Guest(
            "registration is not open for this election phase".into(),
        )));
    }

    let me = agent_info()?.agent_initial_pubkey;
    if let Some(ref allowed) = election.allowed_voters {
        if !allowed.iter().any(|k| *k == me) {
            return Err(wasm_error!(WasmErrorInner::Guest(
                "agent is not on the election allowlist".into(),
            )));
        }
    }

    let existing = get_links(
        LinkQuery::try_new(election_eh.clone(), LinkTypes::VoterRegistration)?,
        GetStrategy::default(),
    )?;
    for link in existing {
        if let Some(reg_eh) = link.target.clone().into_entry_hash() {
            if let Some(reg_rec) = get(reg_eh, GetOptions::network())? {
                if *reg_rec.action().author() == me {
                    return Err(wasm_error!(WasmErrorInner::Guest(
                        "this agent is already registered for this election".into(),
                    )));
                }
            }
        }
    }

    if let Some(max) = election.max_registrations {
        let n = count_distinct_registrants(election_eh.clone())?;
        if (n as u32) >= max {
            return Err(wasm_error!(WasmErrorInner::Guest(
                "election has reached its registration limit".into(),
            )));
        }
    }

    let reg = Registration {
        election_action: election_action.clone(),
    };
    let reg_ah = create_entry(EntryTypes::Registration(reg))?;
    let reg_rec = must_get_valid_record(reg_ah)?;
    let reg_eh = entry_hash_from_record(&reg_rec)?;
    create_link(
        election_eh,
        reg_eh,
        LinkTypes::VoterRegistration,
        (),
    )?;
    Ok(())
}

#[hdk_extern]
fn cast_vote(input: CastVoteInput) -> ExternResult<ActionHash> {
    let create_rec = must_get_valid_record(input.election_action.clone())?;
    require_election_create_shape(&create_rec)?;
    let election_eh = entry_hash_from_record(&create_rec)?;
    let (_, election) = get_latest_election_for_create(input.election_action.clone())?;

    if !phase_allows_voting(&election.phase) {
        return Err(wasm_error!(WasmErrorInner::Guest(
            "voting is not open for this election phase".into(),
        )));
    }

    if (input.choice_index as usize) >= election.options.len() {
        return Err(wasm_error!(WasmErrorInner::Guest(
            "choice_index out of range".into()
        )));
    }

    let me = agent_info()?.agent_initial_pubkey;

    let reg_links = get_links(
        LinkQuery::try_new(election_eh.clone(), LinkTypes::VoterRegistration)?,
        GetStrategy::default(),
    )?;
    let mut is_registered = false;
    for link in reg_links {
        if let Some(reg_eh) = link.target.clone().into_entry_hash() {
            if let Some(reg_rec) = get(reg_eh, GetOptions::network())? {
                if *reg_rec.action().author() == me {
                    is_registered = true;
                    break;
                }
            }
        }
    }
    if !is_registered {
        return Err(wasm_error!(WasmErrorInner::Guest(
            "register as a voter before casting a vote".into(),
        )));
    }

    let links = get_links(
        LinkQuery::try_new(election_eh.clone(), LinkTypes::Ballot)?,
        GetStrategy::default(),
    )?;

    for link in links {
        if let Some(vote_eh) = link.target.clone().into_entry_hash() {
            if let Some(vote_rec) = get(vote_eh, GetOptions::network())? {
                if *vote_rec.action().author() == me {
                    return Err(wasm_error!(WasmErrorInner::Guest(
                        "this agent already voted in this election".into(),
                    )));
                }
            }
        }
    }

    let vote = Vote {
        election_action: input.election_action.clone(),
        choice_index: input.choice_index,
    };
    let vote_ah = create_entry(EntryTypes::Vote(vote))?;
    let vote_rec = must_get_valid_record(vote_ah.clone())?;
    let vote_eh = entry_hash_from_record(&vote_rec)?;
    create_link(
        election_eh,
        vote_eh,
        LinkTypes::Ballot,
        (),
    )?;
    Ok(vote_ah)
}

#[hdk_extern]
fn get_tally(election_action: ActionHash) -> ExternResult<TallyOutput> {
    let create_rec = must_get_valid_record(election_action.clone())?;
    require_election_create_shape(&create_rec)?;
    let election_eh = entry_hash_from_record(&create_rec)?;
    let (_, election) = get_latest_election_for_create(election_action.clone())?;

    let mut counts = vec![0u32; election.options.len()];
    let mut vote_action_hashes: Vec<ActionHash> = Vec::new();

    let links = get_links(
        LinkQuery::try_new(election_eh, LinkTypes::Ballot)?,
        GetStrategy::default(),
    )?;

    for link in links {
        if let Some(vote_eh) = link.target.clone().into_entry_hash() {
            if let Some(vote_rec) = get(vote_eh, GetOptions::network())? {
                let vote: Vote = vote_rec
                    .entry()
                    .to_app_option()
                    .map_err(|e| wasm_error!(WasmErrorInner::Guest(e.to_string())))?
                    .ok_or_else(|| wasm_error!(WasmErrorInner::Guest("vote entry missing".into())))?;
                if let Some(slot) = counts.get_mut(vote.choice_index as usize) {
                    *slot += 1;
                }
                vote_action_hashes.push(vote_rec.action_address().clone());
            }
        }
    }

    vote_action_hashes.sort_by(|a, b| a.get_raw_32().cmp(b.get_raw_32()));

    Ok(TallyOutput {
        title: election.title,
        options: election.options,
        counts,
        vote_action_hashes,
    })
}
