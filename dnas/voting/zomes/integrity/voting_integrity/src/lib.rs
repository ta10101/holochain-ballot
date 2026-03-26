//! Integrity zome: `Election`, `Registration`, `Vote` + validation rules.

use hdi::prelude::*;

/// Bounds to limit DHT spam / oversized entries (coordinator mirrors for early errors).
pub const MAX_ELECTION_TITLE_BYTES: usize = 512;
pub const MAX_ELECTION_OPTIONS: usize = 64;
pub const MAX_OPTION_TEXT_BYTES: usize = 256;
/// Cap for invite-only elections (`Election::allowed_voters`).
pub const MAX_ALLOWLIST_VOTERS: usize = 2048;
/// Upper bound for [`Election::max_registrations`] when set (coordinator + integrity).
pub const MAX_ELECTION_REGISTRATIONS_CAP: u32 = 50_000;

/// Lifecycle phase stored on [`Election`]. Default is [`ElectionPhase::Active`] for backward compatibility.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "snake_case")]
pub enum ElectionPhase {
    /// Legacy: registration and voting both allowed (v0 behavior).
    #[default]
    Active,
    Draft,
    OpenRegistration,
    OpenVoting,
    Closed,
}

#[hdk_entry_helper]
pub struct Election {
    pub title: String,
    pub options: Vec<String>,
    #[serde(default)]
    pub phase: ElectionPhase,
    #[serde(default)]
    pub allowed_voters: Option<Vec<AgentPubKey>>,
    /// Optional cap on how many distinct agents may register (`None` = no limit).
    #[serde(default)]
    pub max_registrations: Option<u32>,
}

#[hdk_entry_helper]
pub struct Registration {
    pub election_action: ActionHash,
}

#[hdk_entry_helper]
pub struct Vote {
    pub election_action: ActionHash,
    pub choice_index: u32,
}

#[hdk_entry_types]
#[unit_enum(UnitEntryTypes)]
pub enum EntryTypes {
    #[entry_type(required_validations = 5)]
    Election(Election),
    #[entry_type(required_validations = 5)]
    Registration(Registration),
    #[entry_type(required_validations = 5)]
    Vote(Vote),
}

#[hdk_link_types]
pub enum LinkTypes {
    /// Election entry → Vote entry (ballot).
    Ballot,
    /// Election entry → Registration entry.
    VoterRegistration,
}

fn validate_election_entry(e: &Election) -> ValidateCallbackResult {
    if e.title.trim().is_empty() || e.options.len() < 2 {
        return ValidateCallbackResult::Invalid(
            "election needs a title and at least two options".into(),
        );
    }
    if e.title.len() > MAX_ELECTION_TITLE_BYTES {
        return ValidateCallbackResult::Invalid("election title too long".into());
    }
    if e.options.len() > MAX_ELECTION_OPTIONS {
        return ValidateCallbackResult::Invalid("too many election options".into());
    }
    if e.options.iter().any(|o| o.trim().is_empty()) {
        return ValidateCallbackResult::Invalid("election options must be non-empty".into());
    }
    if e.options
        .iter()
        .any(|o| o.len() > MAX_OPTION_TEXT_BYTES)
    {
        return ValidateCallbackResult::Invalid("an election option is too long".into());
    }
    if let Some(ref keys) = e.allowed_voters {
        if keys.len() > MAX_ALLOWLIST_VOTERS {
            return ValidateCallbackResult::Invalid("allowed_voters list too large".into());
        }
    }
    if let Some(n) = e.max_registrations {
        if n < 1 {
            return ValidateCallbackResult::Invalid(
                "max_registrations must be at least 1 when set".into(),
            );
        }
        if n > MAX_ELECTION_REGISTRATIONS_CAP {
            return ValidateCallbackResult::Invalid("max_registrations exceeds cap".into());
        }
    }
    ValidateCallbackResult::Valid
}

#[hdk_extern]
fn genesis_self_check(_data: GenesisSelfCheckData) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Valid)
}

#[hdk_extern]
fn validate(op: Op) -> ExternResult<ValidateCallbackResult> {
    if let Op::StoreEntry(StoreEntry { action, entry }) = op {
        if let Some(app_def) = action.hashed.content.app_entry_def() {
            match EntryTypes::deserialize_from_type(
                app_def.zome_index,
                app_def.entry_index,
                &entry,
            )? {
                Some(EntryTypes::Election(e)) => {
                    return Ok(validate_election_entry(&e));
                }
                Some(EntryTypes::Registration(r)) => {
                    let er = must_get_valid_record(r.election_action.clone())?;
                    let _: Election = er
                        .entry()
                        .to_app_option()
                        .map_err(|e| wasm_error!(WasmErrorInner::Guest(e.to_string())))?
                        .ok_or_else(|| {
                            wasm_error!(WasmErrorInner::Guest(
                                "registration must reference an election".into()
                            ))
                        })?;
                }
                Some(EntryTypes::Vote(v)) => {
                    let er = must_get_valid_record(v.election_action.clone())?;
                    let election: Election = er
                        .entry()
                        .to_app_option()
                        .map_err(|e| wasm_error!(WasmErrorInner::Guest(e.to_string())))?
                        .ok_or_else(|| {
                            wasm_error!(WasmErrorInner::Guest("vote must reference an election".into()))
                        })?;
                    if (v.choice_index as usize) >= election.options.len() {
                        return Ok(ValidateCallbackResult::Invalid(
                            "choice_index out of range for this election".into(),
                        ));
                    }
                }
                None => {}
            }
        }
    }
    Ok(ValidateCallbackResult::Valid)
}
