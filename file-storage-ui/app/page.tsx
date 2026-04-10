"use client";

import "./styles.css";
import "./login/page";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { getProgram } from "../lib/anchor";
import { AnchorWallet } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { useRouter } from "next/navigation";

import { uploadToIPFS } from "../lib/ipfs";

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

  const [cid, setCid] = useState<string | null>(null);
  const [ipfsLink, setIpfsLink] = useState<string | null>(null);

  const [fileType, setFileType] = useState<string | null>(null);

  // 🔹 FILE INPUT
  /*const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };*/
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      setFile(selectedFile);
      setFileType(selectedFile.type); // 🔥 ADD THIS
    }
  };

  // 🔹 HASH GENERATION
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

  // 🔹 REGISTER FILE + IPFS
  const registerFile = async () => {
    if (!wallet.publicKey) {
      alert("Connect wallet first");
      return;
    }

    if (!file || !fileHashBytes) {
      alert("Generate file hash first");
      return;
    }

    try {
      const program = getProgram(wallet as AnchorWallet);

      // 🔥 1. Upload to IPFS
      const cid = await uploadToIPFS(file);
      const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;

      setCid(cid);
      setIpfsLink(ipfsUrl);

      // 🔥 2. PDA
      const [fileRecordPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("file"),
          wallet.publicKey.toBuffer(),
          Buffer.from(fileHashBytes),
        ],
        program.programId
      );

      // 🔥 3. Check duplicate
      const existing = await (
        program.account as {
          fileRecord: { fetchNullable: (pda: PublicKey) => Promise<unknown> };
        }
      ).fileRecord.fetchNullable(fileRecordPDA);

      if (existing) {
        alert("⚠️ File already registered");
        return;
      }

      // 🔥 4. Store on-chain
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

      alert("✅ File uploaded to IPFS + registered on-chain");
    } catch (err) {
      console.error(err);
      alert("❌ Upload failed");
    }
  };

  // 🔹 HEX → BYTES
  const hexToBytes = (hex: string) => {
    const cleanHex = hex.trim().toLowerCase();

    if (!/^[0-9a-f]{64}$/.test(cleanHex)) {
      throw new Error("Invalid hash format");
    }

    const bytes = new Uint8Array(32);

    for (let i = 0; i < 32; i++) {
      bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
    }

    return bytes;
  };

  // 🔹 VERIFY
  const verifyFile = async () => {
    if (!wallet.publicKey) {
      alert("Connect wallet first");
      return;
    }

    if (!verifyHash) {
      alert("Enter a file hash");
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

      alert("✅ File verified successfully");
    } catch (err) {
      console.error(err);
      alert("❌ File NOT found");
    }
  };

  if (!wallet.connected) return null;

  return (
    <div className="page-container">
      <div className="top-bar">
        <div className="logo">⚡ Blockchain file storage system</div>
        <WalletMultiButtonDynamic />
      </div>

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

          {/* 🔥 IPFS LINK HERE */}
          {ipfsLink && (
            <p className="mt-2">
              🌐{" "}
              <a href={ipfsLink} target="_blank" className="link blue">
                View File on IPFS
              </a>
            </p>
          )}

          {ipfsLink && fileType && (
            <div className="preview-container">
              <h3>Preview</h3>

              {/* 🖼 IMAGE PREVIEW */}
              {fileType.startsWith("image/") && (
                <img
                  src={ipfsLink}
                  alt="Uploaded file"
                  className="preview-image"
                />
              )}

              {/* 📄 PDF PREVIEW */}
              {fileType === "application/pdf" && (
                <iframe src={ipfsLink} className="preview-pdf" />
              )}

              {/* 📦 FALLBACK */}
              {!fileType.startsWith("image/") &&
                fileType !== "application/pdf" && (
                  <p>Preview not available for this file type.</p>
                )}
            </div>
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
        </div>
      </div>
    </div>
  );
}
