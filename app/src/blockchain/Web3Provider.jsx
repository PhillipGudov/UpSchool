import React, { createContext, useEffect, useMemo, useState } from "react";
import Web3 from "web3";
import abi from "../abi/TranscriptAttendance.json";

export const Web3Ctx = createContext(null);

export default function Web3Provider({ children }) {
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [networkOk, setNetworkOk] = useState(null);

useEffect(() => {
  (async () => {
    if (!window.ethereum) { setNetworkOk(false); return; }

    const w3 = new Web3(window.ethereum);
    setWeb3(w3);

    try {
      const accs = await window.ethereum.request({ method: "eth_requestAccounts" });
      setAccount(accs?.[0] ?? null);

      // Robust local network detection
      const LOCAL_IDS = [1337, 5777, 31337]; // Ganache, older Truffle, Hardhat
      let chainNum = null;

      // Try both APIs to be safe
      try {
        chainNum = await w3.eth.getChainId(); // number (e.g., 1337)
      } catch {}
      try {
        const hex = await window.ethereum.request({ method: "eth_chainId" }); // e.g., "0x539"
        if (hex) chainNum = parseInt(hex, 16);
      } catch {}

      setNetworkOk(LOCAL_IDS.includes(Number(chainNum)));

      const addr = import.meta.env.VITE_CONTRACT_ADDRESS;
      const c = new w3.eth.Contract(abi.abi, addr);
      setContract(c);
    } catch (e) {
      console.error("MetaMask connect error:", e);
      setNetworkOk(false);
    }

    window.ethereum?.on?.("accountsChanged", (accs) => setAccount(accs[0] ?? null));
    window.ethereum?.on?.("chainChanged", () => window.location.reload());
  })();
}, []);

  const value = useMemo(() => ({ web3, account, contract, networkOk }), [web3, account, contract, networkOk]);
  return <Web3Ctx.Provider value={value}>{children}</Web3Ctx.Provider>;
}