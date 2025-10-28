import React, { useContext, useEffect, useState } from "react";
import { Web3Ctx } from "./blockchain/Web3Provider.jsx";

export default function Home() {
  const { account, contract, networkOk } = useContext(Web3Ctx);
  const [course, setCourse] = useState(null);
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    (async () => {
      if (!contract) return;
      try {
        setStatus("loading");
        // demo read from our migration/tests: course 101 may not exist, so handle gracefully
        const c = await contract.methods.getCourse(101).call();
        if (c?.exists) setCourse(c);
        setStatus("ready");
      } catch (e) {
        console.warn("getCourse(101) failed (ok on fresh chain)", e.message);
        setStatus("ready");
      }
    })();
  }, [contract]);

  return (
    <div style={{ maxWidth: 720, margin: "24px auto", fontFamily: "system-ui, sans-serif" }}>
      <h1>PowerSchool DApp</h1>
      <p>Connected account: <b>{account || "(connect in MetaMask)"}</b></p>
      <p>Contract: <b>{contract?.options?.address || "(not set)"}</b></p>
      <p>Network: {networkOk === null ? "…" : networkOk ? "✅ Localhost 1337" : "❌ switch MetaMask to Localhost 8545"}</p>

      {status === "loading" && <p>Loading…</p>}
      {course && (
        <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8 }}>
          <div><b>Course:</b> {course.name}</div>
          <div><b>Teacher:</b> {course.teacher}</div>
          <div><b>ID:</b> {course.id}</div>
        </div>
      )}
      {!course && status === "ready" && (
        <p>No seeded course found yet. You can create one from the Registrar page (coming next).</p>
      )}
    </div>
  );
}