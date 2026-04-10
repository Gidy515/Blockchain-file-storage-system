/*import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { FileStorage } from "../target/types/file_storage";

describe("file-storage", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.fileStorage as Program<FileStorage>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});*/
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { FileStorageDapp } from "../target/types/file_storage_dapp";
import { assert } from "chai";

describe("file_storage_dapp", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.FileStorageDapp as Program<FileStorageDapp>;

  it("Registers a file hash", async () => {
    const fileRecord = anchor.web3.Keypair.generate();
    const fileHash = "abc123hash";

    await program.methods
      .registerFile(fileHash)
      .accounts({
        fileRecord: fileRecord.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([fileRecord])
      .rpc();

    const account = await program.account.fileRecord.fetch(
      fileRecord.publicKey
    );

    assert.equal(account.fileHash, fileHash);
  });

  it("Verifies a correct file hash", async () => {
    const fileRecord = anchor.web3.Keypair.generate();
    const fileHash = "correcthash";

    await program.methods
      .registerFile(fileHash)
      .accounts({
        fileRecord: fileRecord.publicKey,
        user: provider.wallet.publicKey,
        //systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([fileRecord])
      .rpc();

    await program.methods
      .verifyFile(fileHash)
      .accounts({
        fileRecord: fileRecord.publicKey,
      })
      .rpc();
  });

  it("Fails verification for incorrect hash", async () => {
    const fileRecord = anchor.web3.Keypair.generate();
    const fileHash = "originalhash";

    await program.methods
      .registerFile(fileHash)
      .accounts({
        fileRecord: fileRecord.publicKey,
        user: provider.wallet.publicKey,
        //systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([fileRecord])
      .rpc();

    try {
      await program.methods
        .verifyFile("wronghash")
        .accounts({
          fileRecord: fileRecord.publicKey,
        })
        .rpc();

      assert.fail("Verification should fail");
    } catch (err) {
      assert.ok(err);
    }
  });
});
