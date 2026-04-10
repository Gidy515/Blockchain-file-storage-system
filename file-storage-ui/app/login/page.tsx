"use client";

import dynamic from "next/dynamic";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import "./login.css";

const WalletMultiButtonDynamic = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

export default function LoginPage() {
  const { connected } = useWallet();
  const router = useRouter();

  // 🔥 Auto redirect when wallet connects
  useEffect(() => {
    if (connected) {
      router.push("/");
    }
  }, [connected]);

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">⚡ FileChain</h1>

        <p className="login-subtitle">
          Securely store and verify files on-chain
        </p>

        <div className="wallet-btn">
          <WalletMultiButtonDynamic />
        </div>

        <p className="login-hint">Connect your wallet to continue</p>
      </div>
    </div>
  );
}
