import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { Connection, clusterApiUrl } from "@solana/web3.js";
import { AnchorWallet } from "@solana/wallet-adapter-react";

// ✅ IMPORT IDL TYPE + JSON
import idl from "../idl/file_strorage_dapp.json";

// 🔥 IMPORTANT: create a TYPE from IDL
export type FileStorageDapp = typeof idl;

// ✅ DEVNET
const network = clusterApiUrl("devnet");

export const connection = new Connection(network, "confirmed");

export const getProgram = (wallet: AnchorWallet) => {
  if (!wallet.publicKey) throw new Error("Wallet not connected");

  const provider = new AnchorProvider(connection, wallet, {
    preflightCommitment: "confirmed",
  });

  // 🔥 THIS IS THE FIX
  return new Program(idl as unknown, provider);
};
