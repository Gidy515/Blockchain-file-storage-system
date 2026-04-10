use anchor_lang::prelude::*;
declare_id!("5P7jKeEDL96XVeyLq8sBmLKFW2GHX7HNd6Y4nXcyHkEB");

mod error;
use error::FileStorageError;

#[program]
pub mod file_storage_dapp {
    use super::*;

    pub fn register_file(ctx: Context<RegisterFile>, file_hash: [u8; 32]) -> Result<()> {
        require!(file_hash != [0u8; 32], FileStorageError::InvalidHash);

        let record = &mut ctx.accounts.file_record;

        record.owner = *ctx.accounts.user.key;
        record.file_hash = file_hash;
        record.timestamp = Clock::get()?.unix_timestamp;

        Ok(())
    }

    pub fn verify_file(ctx: Context<VerifyFile>, file_hash: [u8; 32]) -> Result<()> {
        let record = &ctx.accounts.file_record;

        require!(
            record.file_hash == file_hash,
            FileStorageError::HashMismatch
        );

        Ok(())
    }

    pub fn get_file_record(_ctx: Context<GetFileRecord>) -> Result<()> {
        // Anchor automatically returns the account data when fetched from the client
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(file_hash: [u8; 32])]
pub struct RegisterFile<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 32 + 8, // adjust to your struct
        seeds = [b"file", user.key().as_ref(), &file_hash],
        bump
    )]
    pub file_record: Account<'info, FileRecord>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(file_hash: [u8; 32])]
pub struct VerifyFile<'info> {
    #[account(
        seeds = [
            b"file",
            file_record.owner.as_ref(),
            &file_hash
        ],
        bump
    )]
    pub file_record: Account<'info, FileRecord>,
}

#[derive(Accounts)]
pub struct GetFileRecord<'info> {
    pub file_record: Account<'info, FileRecord>,
}

#[account]
pub struct FileRecord {
    pub owner: Pubkey,
    pub file_hash: [u8; 32],
    pub timestamp: i64,
}

impl FileRecord {
    const LEN: usize =
        8 +     // discriminator
        32 +    // owner pubkey
        4 + 64 +// string prefix + max hash length
        8;      // timestamp
}

