"use client";

import "./styles.css";

import "./login/page";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { getProgram } from "../lib/anchor";
import { AnchorWallet } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";
import { PublicKey, SystemProgram } from "@solana/web3.js";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const WalletMultiButtonDynamic = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

export default function Home() {
  const wallet = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (!wallet.connected) {
      router.push("/login");
    }
  }, [wallet.connected, router]);

  // 🔹 STATE
  const [fileHash, setFileHash] = useState("");
  const [verifyHash, setVerifyHash] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileHashBytes, setFileHashBytes] = useState<Uint8Array | null>(null);

  const [registerTx, setRegisterTx] = useState<string | null>(null);
  const [verifyTx, setVerifyTx] = useState<string | null>(null);
  const [accountLink, setAccountLink] = useState<string | null>(null);

  // 🔹 HANDLE FILE INPUT
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // 🔹 GENERATE HASH
  const generateFileHash = async () => {
    if (!file) {
      alert("Please select a file first");
      return;
    }

    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);

    const hashArray = Array.from(new Uint8Array(hashBuffer));

    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    setFileHash(hashHex);
    setFileHashBytes(new Uint8Array(hashBuffer));
  };

  // 🔹 REGISTER FILE
  const registerFile = async () => {
    if (!wallet.publicKey) {
      alert("Connect wallet first");
      return;
    }

    if (!fileHashBytes) {
      alert("Generate file hash first");
      return;
    }

    const program = getProgram(wallet as AnchorWallet);

    const [fileRecordPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("file"),
        wallet.publicKey.toBuffer(),
        Buffer.from(fileHashBytes),
      ],
      program.programId
    );

    const existing = await (
      program.account as {
        fileRecord: { fetchNullable: (pda: PublicKey) => Promise<unknown> };
      }
    ).fileRecord.fetchNullable(fileRecordPDA);

    if (existing) {
      alert("⚠️ File already registered on-chain");
      return;
    }

    const signature = await program.methods
      .registerFile([...fileHashBytes])
      .accounts({
        fileRecord: fileRecordPDA,
        user: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const txLink = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
    const accLink = `https://explorer.solana.com/address/${fileRecordPDA.toString()}?cluster=devnet`;

    setRegisterTx(txLink);
    setAccountLink(accLink);

    alert("File has been successfully registered on the solana blockchain");
  };

  // 🔹 HEX → BYTES
  const hexToBytes = (hex: string) => {
    const cleanHex = hex.trim().toLowerCase();

    if (!/^[0-9a-f]{64}$/.test(cleanHex)) {
      throw new Error("Invalid hash format (must be 64 hex chars)");
    }

    const bytes = new Uint8Array(32);

    for (let i = 0; i < 32; i++) {
      bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
    }

    return bytes;
  };

  // 🔹 VERIFY FILE
  const verifyFile = async () => {
    if (!wallet.publicKey) {
      alert("Connect wallet first");
      return;
    }

    if (!verifyHash) {
      alert("Enter a file hash to verify");
      return;
    }

    try {
      const program = getProgram(wallet as AnchorWallet);

      const hashBytes = hexToBytes(verifyHash);

      const [fileRecordPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("file"),
          wallet.publicKey.toBuffer(),
          Buffer.from(hashBytes),
        ],
        program.programId
      );

      const signature = await program.methods
        .verifyFile([...hashBytes])
        .accounts({
          fileRecord: fileRecordPDA,
        })
        .rpc();

      const txLink = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
      const accLink = `https://explorer.solana.com/address/${fileRecordPDA.toString()}?cluster=devnet`;

      setVerifyTx(txLink);
      setAccountLink(accLink);

      alert(
        "File has been VERIFIED on the solana blockchain, the hash matches the registered record"
      );
    } catch (err) {
      console.error(err);
      alert("❌ File NOT found or hash mismatch");
    }
  };

  if (!wallet.connected) return null;

  return (
    <div className="page-container">
      {/* 🔝 TOP BAR */}
      <div className="top-bar">
        <div className="logo">⚡ Blockchain file storage system</div>
        <WalletMultiButtonDynamic />
      </div>

      {/* 🔥 CENTERED CONTENT */}
      <div className="center-wrapper">
        {/* 🔹 UPLOAD */}
        <div className="card">
          <h2>Upload File</h2>

          <input
            type="file"
            className="input-file"
            onChange={handleFileChange}
          />

          <div className="button-group">
            <button className="btn yellow" onClick={generateFileHash}>
              Generate Hash
            </button>

            <button className="btn blue" onClick={registerFile}>
              Upload File
            </button>
          </div>

          {fileHash && (
            <p className="hash-text">
              <strong>Hash:</strong> {fileHash}
            </p>
          )}

          {registerTx && (
            <a href={registerTx} target="_blank" className="link blue">
              View Register Transaction
            </a>
          )}

          {accountLink && (
            <a href={accountLink} target="_blank" className="link purple">
              View On-chain Record
            </a>
          )}
        </div>

        {/* 🔹 VERIFY */}
        <div className="card">
          <h2>Verify File</h2>

          <input
            className="input"
            placeholder="Enter file hash"
            value={verifyHash}
            onChange={(e) => setVerifyHash(e.target.value)}
          />

          <button className="btn green" onClick={verifyFile}>
            Verify File
          </button>

          {verifyTx && (
            <a href={verifyTx} target="_blank" className="link green">
              View Verify Transaction
            </a>
          )}

          {accountLink && (
            <a href={accountLink} target="_blank" className="link purple">
              View On-chain Record
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
