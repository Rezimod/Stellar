use anchor_lang::prelude::*;

declare_id!("t17oa4uuLXhSDZh2WSgYA4vDzUx3iCDDRnJ2iY5AywT");

const MAX_STARS_PER_OBSERVATION: u32 = 500;

/// Stellar Proof-of-Observation registry.
///
/// Records verified astronomical observations as on-chain attestations. Writes
/// are signed by a server-held `oracle_authority` — the same trust model as
/// Stellar's off-chain HMAC verification token and server-side Stars mint: only
/// the server (which runs Claude Vision + Open-Meteo + EXIF/dedup checks) can
/// attest an observation's confidence. Users never sign; the write is gasless.
#[program]
pub mod stellar_observations {
    use super::*;

    /// One-time setup. The signer becomes `admin`; `oracle_authority` is the
    /// key allowed to record observations.
    pub fn initialize_registry(
        ctx: Context<InitializeRegistry>,
        oracle_authority: Pubkey,
    ) -> Result<()> {
        let r = &mut ctx.accounts.registry;
        r.admin = ctx.accounts.admin.key();
        r.oracle_authority = oracle_authority;
        r.total_observations = 0;
        r.paused = false;
        r.bump = ctx.bumps.registry;
        Ok(())
    }

    pub fn set_oracle_authority(ctx: Context<AdminOnly>, new_authority: Pubkey) -> Result<()> {
        ctx.accounts.registry.oracle_authority = new_authority;
        Ok(())
    }

    pub fn set_paused(ctx: Context<AdminOnly>, paused: bool) -> Result<()> {
        ctx.accounts.registry.paused = paused;
        Ok(())
    }

    /// Record a verified observation. The `Observation` PDA is seeded by the
    /// photo's file hash, so re-recording the same photo fails the `init`
    /// (on-chain dedup). `init_if_needed` upserts the observer's profile.
    pub fn record_observation(
        ctx: Context<RecordObservation>,
        args: RecordObservationArgs,
    ) -> Result<()> {
        let registry = &mut ctx.accounts.registry;
        require!(!registry.paused, ObsError::RegistryPaused);
        require!(args.confidence <= 3, ObsError::InvalidConfidence);
        require!(args.target_code <= 5, ObsError::InvalidTarget);
        require!(
            args.stars_awarded <= MAX_STARS_PER_OBSERVATION,
            ObsError::StarsAwardTooLarge
        );

        let now = Clock::get()?.unix_timestamp;

        let obs = &mut ctx.accounts.observation;
        obs.observer = args.observer;
        obs.target_code = args.target_code;
        obs.identified_hash = args.identified_hash;
        obs.confidence = args.confidence;
        obs.lat_micro = args.lat_micro;
        obs.lon_micro = args.lon_micro;
        obs.observed_at = args.observed_at;
        obs.oracle_hash = args.oracle_hash;
        obs.cloud_cover = args.cloud_cover;
        obs.stars_awarded = args.stars_awarded;
        obs.file_hash = args.file_hash;
        obs.revoked = false;
        obs.bump = ctx.bumps.observation;

        let profile = &mut ctx.accounts.observer_profile;
        // Freshly-created profiles are zeroed → observer is the default pubkey.
        if profile.observer == Pubkey::default() {
            profile.observer = args.observer;
            profile.first_seen = now;
            profile.bump = ctx.bumps.observer_profile;
        }
        profile.total_observations = profile.total_observations.saturating_add(1);
        profile.total_stars = profile.total_stars.saturating_add(args.stars_awarded as u64);
        profile.last_seen = now;

        registry.total_observations = registry.total_observations.saturating_add(1);

        emit!(ObservationRecorded {
            observer: args.observer,
            file_hash: args.file_hash,
            target_code: args.target_code,
            confidence: args.confidence,
            stars_awarded: args.stars_awarded,
            observed_at: args.observed_at,
        });
        Ok(())
    }

    /// Anti-fraud clawback: mark an observation revoked and roll back the
    /// observer's counters. Oracle/admin only.
    pub fn revoke_observation(ctx: Context<RevokeObservation>, _file_hash: [u8; 20]) -> Result<()> {
        let obs = &mut ctx.accounts.observation;
        require!(!obs.revoked, ObsError::AlreadyRevoked);
        obs.revoked = true;

        let profile = &mut ctx.accounts.observer_profile;
        profile.revoked_count = profile.revoked_count.saturating_add(1);
        profile.total_observations = profile.total_observations.saturating_sub(1);
        profile.total_stars = profile.total_stars.saturating_sub(obs.stars_awarded as u64);

        emit!(ObservationRevoked {
            observer: obs.observer,
            file_hash: obs.file_hash,
        });
        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct RecordObservationArgs {
    pub observer: Pubkey,
    /// First 20 bytes of the sha256 image hash (matches the off-chain `0x…` id).
    pub file_hash: [u8; 20],
    /// 0 moon · 1 planet · 2 stars · 3 constellation · 4 deep_sky · 5 unknown.
    pub target_code: u8,
    /// sha256 of the identified object string.
    pub identified_hash: [u8; 32],
    /// 0 rejected · 1 low · 2 medium · 3 high.
    pub confidence: u8,
    pub lat_micro: i32,
    pub lon_micro: i32,
    pub observed_at: i64,
    /// Weather-oracle hash (Open-Meteo cloud-cover attestation).
    pub oracle_hash: [u8; 32],
    pub cloud_cover: u8,
    pub stars_awarded: u32,
}

#[derive(Accounts)]
pub struct InitializeRegistry<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + Registry::INIT_SPACE,
        seeds = [b"registry"],
        bump
    )]
    pub registry: Account<'info, Registry>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdminOnly<'info> {
    #[account(
        mut,
        seeds = [b"registry"],
        bump = registry.bump,
        has_one = admin @ ObsError::Unauthorized
    )]
    pub registry: Account<'info, Registry>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(args: RecordObservationArgs)]
pub struct RecordObservation<'info> {
    #[account(
        mut,
        seeds = [b"registry"],
        bump = registry.bump,
        has_one = oracle_authority @ ObsError::Unauthorized
    )]
    pub registry: Account<'info, Registry>,
    #[account(
        init,
        payer = oracle_authority,
        space = 8 + Observation::INIT_SPACE,
        seeds = [b"obs", args.file_hash.as_ref()],
        bump
    )]
    pub observation: Account<'info, Observation>,
    #[account(
        init_if_needed,
        payer = oracle_authority,
        space = 8 + ObserverProfile::INIT_SPACE,
        seeds = [b"observer", args.observer.as_ref()],
        bump
    )]
    pub observer_profile: Account<'info, ObserverProfile>,
    #[account(mut)]
    pub oracle_authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(file_hash: [u8; 20])]
pub struct RevokeObservation<'info> {
    #[account(
        seeds = [b"registry"],
        bump = registry.bump,
        has_one = oracle_authority @ ObsError::Unauthorized
    )]
    pub registry: Account<'info, Registry>,
    #[account(
        mut,
        seeds = [b"obs", file_hash.as_ref()],
        bump = observation.bump
    )]
    pub observation: Account<'info, Observation>,
    #[account(
        mut,
        seeds = [b"observer", observation.observer.as_ref()],
        bump = observer_profile.bump
    )]
    pub observer_profile: Account<'info, ObserverProfile>,
    pub oracle_authority: Signer<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct Registry {
    pub admin: Pubkey,
    pub oracle_authority: Pubkey,
    pub total_observations: u64,
    pub paused: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct ObserverProfile {
    pub observer: Pubkey,
    pub total_observations: u64,
    pub total_stars: u64,
    pub first_seen: i64,
    pub last_seen: i64,
    pub revoked_count: u32,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Observation {
    pub observer: Pubkey,
    pub target_code: u8,
    pub identified_hash: [u8; 32],
    pub confidence: u8,
    pub lat_micro: i32,
    pub lon_micro: i32,
    pub observed_at: i64,
    pub oracle_hash: [u8; 32],
    pub cloud_cover: u8,
    pub stars_awarded: u32,
    pub file_hash: [u8; 20],
    pub revoked: bool,
    pub bump: u8,
}

#[event]
pub struct ObservationRecorded {
    pub observer: Pubkey,
    pub file_hash: [u8; 20],
    pub target_code: u8,
    pub confidence: u8,
    pub stars_awarded: u32,
    pub observed_at: i64,
}

#[event]
pub struct ObservationRevoked {
    pub observer: Pubkey,
    pub file_hash: [u8; 20],
}

#[error_code]
pub enum ObsError {
    #[msg("Signer is not authorized for this action")]
    Unauthorized,
    #[msg("Registry is paused")]
    RegistryPaused,
    #[msg("Confidence must be 0..=3")]
    InvalidConfidence,
    #[msg("Target code must be 0..=5")]
    InvalidTarget,
    #[msg("Observation already revoked")]
    AlreadyRevoked,
    #[msg("Stars award exceeds the per-observation cap")]
    StarsAwardTooLarge,
}
