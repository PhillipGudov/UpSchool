// app/src/pages/RegistrarDashboard.jsx
import React, { useContext, useEffect, useState } from "react";
import { Web3Ctx } from "../blockchain/Web3Provider.jsx";
import { useRoles } from "../blockchain/useRoles.js";
import RoleGuard from "../components/RoleGuard.jsx";

export default function RegistrarDashboard() {
  const { web3, contract, account } = useContext(Web3Ctx);
  const { isRegistrar, loading } = useRoles();
  const [feeEth, setFeeEth] = useState("0.01");
  const [currentFee, setCurrentFee] = useState(null);
  const [txMsg, setTxMsg] = useState("");

  useEffect(() => {
    (async () => {
      if (!contract) return;
      const feeWei = await contract.methods.verificationFee().call();
      setCurrentFee(web3?.utils?.fromWei(feeWei, "ether"));
    })();
  }, [contract, web3]);

  if (loading) return <p>Loading role…</p>;

  const setFee = async (e) => {
    e.preventDefault();
    setTxMsg("Sending transaction…");
    try {
      const wei = web3.utils.toWei(feeEth, "ether");
      await contract.methods.setVerificationFee(wei).send({ from: account });
      setCurrentFee(feeEth);
      setTxMsg("✅ Fee updated");
    } catch (err) {
      setTxMsg(`❌ ${err.message}`);
    }
  };

  const withdraw = async () => {
    setTxMsg("Sending transaction…");
    try {
      await contract.methods.withdrawFees().send({ from: account });
      setTxMsg("✅ Fees withdrawn");
    } catch (err) {
      setTxMsg(`❌ ${err.message}`);
    }
  };

  return (
    <RoleGuard allowed={isRegistrar}>
      <h2>Registrar Dashboard</h2>
      <p>Connected as: <b>{account}</b></p>

      <div style={{display:"grid", gap:24}}>
        <form onSubmit={setFee} style={card}>
          <h3>Set Verification Fee</h3>
          <p>Current fee: <b>{currentFee ?? "…"}</b> ETH</p>
          <label style={{display:"grid", gap:8}}>
            <span>New fee (ETH)</span>
            <input type="number" step="0.0001" value={feeEth} onChange={e=>setFeeEth(e.target.value)} />
          </label>
          <button>Save</button>
        </form>

        <div style={card}>
          <h3>Withdraw Accumulated Fees</h3>
          <button onClick={withdraw}>Withdraw to Registrar</button>
        </div>
      </div>

      {txMsg && <p>{txMsg}</p>}
    </RoleGuard>
  );
}

const card = { border:"1px solid #eee", borderRadius:12, padding:16 };