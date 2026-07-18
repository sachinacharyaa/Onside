use anchor_lang::prelude::*;

declare_id!("SetLAgnt11111111111111111111111111111111111");

/// Onside settlement program — deliberately minimal.
/// One instruction stores an immutable settlement record:
/// match id, final outcome, a hash of the triggering match data, timestamp.
#[program]
pub mod settling_agent {
    use super::*;

    /// outcome: 0 = home, 1 = away, 2 = draw
    pub fn settle_market(
        ctx: Context<SettleMarket>,
        match_id: String,
        outcome: u8,
        proof_hash: [u8; 32],
    ) -> Result<()> {
        require!(match_id.len() <= 64, SettleError::MatchIdTooLong);
        require!(outcome <= 2, SettleError::InvalidOutcome);

        let record = &mut ctx.accounts.settlement;
        record.match_id = match_id;
        record.outcome = outcome;
        record.proof_hash = proof_hash;
        record.settled_at = Clock::get()?.unix_timestamp;
        record.authority = ctx.accounts.authority.key();

        msg!(
            "Onside settled match {} with outcome {}",
            record.match_id,
            record.outcome
        );
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(match_id: String)]
pub struct SettleMarket<'info> {
    /// PDA keyed by match id — a market can only ever be settled once
    /// (`init` fails on the second attempt).
    #[account(
        init,
        payer = authority,
        space = 8 + 4 + 64 + 1 + 32 + 8 + 32,
        seeds = [b"settlement", match_id.as_bytes()],
        bump
    )]
    pub settlement: Account<'info, SettlementRecord>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct SettlementRecord {
    pub match_id: String,     // 4 + 64
    pub outcome: u8,          // 1
    pub proof_hash: [u8; 32], // 32
    pub settled_at: i64,      // 8
    pub authority: Pubkey,    // 32
}

#[error_code]
pub enum SettleError {
    #[msg("match id must be 64 bytes or fewer")]
    MatchIdTooLong,
    #[msg("outcome must be 0 (home), 1 (away) or 2 (draw)")]
    InvalidOutcome,
}
