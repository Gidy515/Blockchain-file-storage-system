use anchor_lang::prelude::*;

#[error_code]
pub enum FileStorageError {

    #[msg("Invalid file hash provided")]
    InvalidHash,

    #[msg("File hash does not match the stored value")]
    HashMismatch,

    #[msg("File already registered")]
    FileAlreadyExists,

    #[msg("Unauthorized operation")]
    Unauthorized,
}