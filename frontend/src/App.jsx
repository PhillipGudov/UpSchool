// frontend/src/App.jsx
// ──────────────────────────────────────────────────────────
// Single-page PowerSchool DApp UI (Registrar/Teacher/Student/Verifier)
// Works with ethers v6, MetaMask, Ganache, and IPFS (Kubo)

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ethers } from "ethers";
import { create as createIpfsClient } from "ipfs-http-client";
import abi from "./abi.json";
import "./index.css";

export default function App() {
  // ────────────────────────────── ENV / singletons
  const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
  const IPFS_API = import.meta.env.VITE_IPFS_API || "http://127.0.0.1:5001";

  const providerRef = useRef(null);
  const signerRef = useRef(null);
  const contractRef = useRef(null);

  // ────────────────────────────── IPFS
  const [ipfs, setIpfs] = useState(null);

  // ────────────────────────────── Session/UI state
  const [account, setAccount] = useState("");
  const [roles, setRoles] = useState({ registrar: false, teacher: false });
  const [feeWei, setFeeWei] = useState("0");
  const [contractBalance, setContractBalance] = useState("0");
  const [busy, setBusy] = useState(false);
  const [lastTx, setLastTx] = useState({ hash: "", status: "" });
  const [error, setError] = useState("");

  // Registrar inputs
  const [courseId, setCourseId] = useState("");
  const [courseName, setCourseName] = useState("");
  const [teacherAddr, setTeacherAddr] = useState("");

  const [studentAddr, setStudentAddr] = useState("");
  const [enrollCourseId, setEnrollCourseId] = useState("");
  const [newFeeEth, setNewFeeEth] = useState("");

  // Teacher inputs
  const [issueCourseId, setIssueCourseId] = useState("");
  const [issueStudentAddr, setIssueStudentAddr] = useState("");
  const [grade, setGrade] = useState("");
  const [gradeFile, setGradeFile] = useState(null);

  const [attCourseId, setAttCourseId] = useState("");
  const [attStudentAddr, setAttStudentAddr] = useState("");
  const [attDate, setAttDate] = useState(""); // yyyy-mm-dd
  const [attStatus, setAttStatus] = useState("Present");
  const [attFile, setAttFile] = useState(null);

  // Student viewer
  const [viewCourseId, setViewCourseId] = useState("");
  const [recordView, setRecordView] = useState(null);
  const [attendanceView, setAttendanceView] = useState([]);

  // Verifier
  const [verStudentAddr, setVerStudentAddr] = useState("");
  const [verCourseId, setVerCourseId] = useState("");
  const [verifyResult, setVerifyResult] = useState(null);

  // Role ids (keccak256 of role strings)
  const REGISTRAR_ROLE = useMemo(
    () => ethers.keccak256(ethers.toUtf8Bytes("REGISTRAR_ROLE")),
    []
  );
  const TEACHER_ROLE = useMemo(
    () => ethers.keccak256(ethers.toUtf8Bytes("TEACHER_ROLE")),
    []
  );

  // Attendance mapping UI → enum
  const STATUS = { Present: 0, Absent: 1, Excused: 2 };

  // ────────────────────────────── Init IPFS (once)
  useEffect(() => {
    try {
      setIpfs(createIpfsClient({ url: IPFS_API }));
    } catch (e) {
      console.warn("IPFS init failed:", e);
      setError("Failed to create IPFS client. Check VITE_IPFS_API.");
    }
  }, [IPFS_API]);

  // ────────────────────────────── Connect wallet + contract
  const connect = async () => {
    setError("");
    if (!window.ethereum) {
      setError("MetaMask not found. Install it and reload.");
      return;
    }
    if (!CONTRACT_ADDRESS) {
      setError("VITE_CONTRACT_ADDRESS is missing in frontend/.env");
      return;
    }

    // Request accounts and set signer
    const provider = new ethers.BrowserProvider(window.ethereum);
    providerRef.current = provider;

    const [addr] = await window.ethereum.request({ method: "eth_requestAccounts" });
    setAccount(addr);

    const signer = await provider.getSigner();
    signerRef.current = signer;

    // Contract instance
    contractRef.current = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);

    // Load basics
    await refreshBasics(addr);
  };

  // ────────────────────────────── Refresh roles, fee, balance
  const refreshBasics = async (addrOverride) => {
    try {
      const c = contractRef.current;
      const provider = providerRef.current;
      const addr = addrOverride || account;
      if (!c || !provider || !addr) return;

      // hasRole checks
      const [isReg, isTeach] = await Promise.all([
        c.hasRole(REGISTRAR_ROLE, addr),
        c.hasRole(TEACHER_ROLE, addr),
      ]);
      setRoles({ registrar: isReg, teacher: isTeach });

      // fee + contract balance
      const fee = await c.verificationFee();
      setFeeWei(fee.toString());

      const bal = await provider.getBalance(CONTRACT_ADDRESS);
      setContractBalance(ethers.formatEther(bal));
    } catch (e) {
      setError(e.shortMessage || e.message);
    }
  };

  // React to account / chain changes
  useEffect(() => {
    if (!window.ethereum) return;
    const onAcc = () => connect().catch((e) => setError(e.message));
    const onChain = () => connect().catch((e) => setError(e.message));
    window.ethereum.on?.("accountsChanged", onAcc);
    window.ethereum.on?.("chainChanged", onChain);
    return () => {
      window.ethereum.removeListener?.("accountsChanged", onAcc);
      window.ethereum.removeListener?.("chainChanged", onChain);
    };
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect().catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ────────────────────────────── Helpers
  const runTx = async (fn) => {
    setBusy(true);
    setError("");
    setLastTx({ hash: "", status: "" });
    try {
      const tx = await fn();
      setLastTx({ hash: tx.hash, status: "pending" });
      const receipt = await tx.wait();
      setLastTx({ hash: receipt.hash, status: receipt.status === 1 ? "success" : "reverted" });
      await refreshBasics();
    } catch (e) {
      setError(e.shortMessage || e.message);
      setLastTx((t) => ({ ...t, status: "error" }));
    } finally {
      setBusy(false);
    }
  };

  const uploadToIPFS = async (file) => {
    if (!file || !ipfs) return "";
    const res = await ipfs.add(file);
    return res?.cid?.toString() || "";
  };

  // ────────────────────────────── Registrar actions
  const onAddCourse = () =>
    runTx(() =>
      contractRef.current.addCourse(
        BigInt(courseId || "0"),
        courseName || "",
        teacherAddr || ethers.ZeroAddress
      )
    );

  const onRegisterStudent = () =>
    runTx(() => contractRef.current.registerStudent(studentAddr || ethers.ZeroAddress));

  const onEnroll = () =>
    runTx(() =>
      contractRef.current.enrollInCourse(
        studentAddr || ethers.ZeroAddress,
        BigInt(enrollCourseId || "0")
      )
    );

  const onSetFee = () =>
    runTx(() => contractRef.current.setVerificationFee(ethers.parseEther(newFeeEth || "0")));

  const onWithdraw = () => runTx(() => contractRef.current.withdrawFees());

  // ────────────────────────────── Teacher actions
  const onIssueGrade = async () => {
    const ipfsHash = await uploadToIPFS(gradeFile);
    return runTx(() =>
      contractRef.current.issueGrade(
        issueStudentAddr || ethers.ZeroAddress,
        BigInt(issueCourseId || "0"),
        grade || "",
        ipfsHash
      )
    );
  };

  const onMarkAttendance = async () => {
    const ipfsHash = await uploadToIPFS(attFile);
    const ts = attDate ? Math.floor(new Date(`${attDate}T00:00:00Z`).getTime() / 1000) : 0;
    return runTx(() =>
      contractRef.current.markAttendance(
        attStudentAddr || ethers.ZeroAddress,
        BigInt(attCourseId || "0"),
        BigInt(ts),
        STATUS[attStatus] ?? 0,
        ipfsHash
      )
    );
  };

  const onFinalize = () =>
    runTx(() =>
      contractRef.current.finalizeRecord(
        issueStudentAddr || ethers.ZeroAddress,
        BigInt(issueCourseId || "0")
      )
    );

  // ────────────────────────────── Student views
  const onViewRecord = async () => {
    setError("");
    setRecordView(null);
    try {
      const rec = await contractRef.current.viewRecord(
        account || studentAddr || ethers.ZeroAddress,
        BigInt(viewCourseId || "0")
      );
      setRecordView(rec);
    } catch (e) {
      setError(e.shortMessage || e.message);
    }
  };

  const onViewAttendance = async () => {
    setError("");
    setAttendanceView([]);
    try {
      const rows = await contractRef.current.viewAttendance(
        account || studentAddr || ethers.ZeroAddress,
        BigInt(viewCourseId || "0")
      );
      setAttendanceView(rows);
    } catch (e) {
      setError(e.shortMessage || e.message);
    }
  };

  // ────────────────────────────── Verifier
  const onVerify = async () => {
    setError("");
    setVerifyResult(null);
    try {
      const fee = await contractRef.current.verificationFee();
      const tx = await contractRef.current.verifyTranscript(
        verStudentAddr || ethers.ZeroAddress,
        BigInt(verCourseId || "0"),
        { value: fee }
      );
      const receipt = await tx.wait();
      setLastTx({ hash: receipt.hash, status: receipt.status === 1 ? "success" : "reverted" });
      const rec = await contractRef.current.viewRecord(
        verStudentAddr || ethers.ZeroAddress,
        BigInt(verCourseId || "0")
      );
      setVerifyResult(rec);
      await refreshBasics();
    } catch (e) {
      setError(e.shortMessage || e.message);
    }
  };

  // ────────────────────────────── Render
  return (
    <div className="container">
      <header className="card">
        <div className="row">
          <img
  src="/logo.png"
  alt="UpSchool Logo"
  style={{ height: "64px", marginBottom: "8px" }}
/>
<h1>UpSchool Interface</h1>
          <button disabled={busy} onClick={() => connect().catch((e) => setError(e.message))}>
            {account ? `Connected: ${account.slice(0, 6)}…${account.slice(-4)}` : "Connect Wallet"}
          </button>
        </div>

        <div className="row small">
          <span>Roles:</span>
          <span className={roles.registrar ? "pill ok" : "pill"}>Registrar</span>
          <span className={roles.teacher ? "pill ok" : "pill"}>Teacher</span>
        </div>

        <div className="row small">
          <span>Verification Fee: {ethers.formatEther(feeWei)} ETH</span>
          <span>Contract Balance: {contractBalance} ETH</span>
        </div>

        {lastTx.hash && (
          <div className={`row small ${lastTx.status}`}>
            <span>Tx: {lastTx.hash}</span>
            <span>Status: {lastTx.status}</span>
          </div>
        )}

        {error && <div className="error">Error: {error}</div>}
      </header>

      {/* Registrar */}
      <section className="card">
        <h2>Registrar</h2>
        <div className="grid">
          <div>
            <h3>Add Course</h3>
            <input placeholder="courseId" value={courseId} onChange={(e) => setCourseId(e.target.value)} />
            <input placeholder="courseName" value={courseName} onChange={(e) => setCourseName(e.target.value)} />
            <input placeholder="teacherAddress" value={teacherAddr} onChange={(e) => setTeacherAddr(e.target.value)} />
            <button disabled={busy || !roles.registrar} onClick={onAddCourse}>Add Course</button>
          </div>

          <div>
            <h3>Register Student</h3>
            <input placeholder="studentAddress" value={studentAddr} onChange={(e) => setStudentAddr(e.target.value)} />
            <button disabled={busy || !roles.registrar} onClick={onRegisterStudent}>Register</button>
          </div>

          <div>
            <h3>Enroll Student</h3>
            <input placeholder="studentAddress" value={studentAddr} onChange={(e) => setStudentAddr(e.target.value)} />
            <input placeholder="courseId" value={enrollCourseId} onChange={(e) => setEnrollCourseId(e.target.value)} />
            <button disabled={busy || !roles.registrar} onClick={onEnroll}>Enroll</button>
          </div>

          <div>
            <h3>Set Verification Fee</h3>
            <input placeholder="fee (ETH)" value={newFeeEth} onChange={(e) => setNewFeeEth(e.target.value)} />
            <button disabled={busy || !roles.registrar} onClick={onSetFee}>Set Fee</button>
          </div>

          <div>
            <h3>Withdraw Fees</h3>
            <button disabled={busy || !roles.registrar} onClick={onWithdraw}>Withdraw</button>
          </div>
        </div>
      </section>

      {/* Teacher */}
      <section className="card">
        <h2>Teacher</h2>
        <div className="grid">
          <div>
            <h3>Issue Grade</h3>
            <input placeholder="studentAddress" value={issueStudentAddr} onChange={(e) => setIssueStudentAddr(e.target.value)} />
            <input placeholder="courseId" value={issueCourseId} onChange={(e) => setIssueCourseId(e.target.value)} />
            <input placeholder="grade (e.g., A or 95%)" value={grade} onChange={(e) => setGrade(e.target.value)} />
            <input type="file" onChange={(e) => setGradeFile(e.target.files?.[0] || null)} />
            <button disabled={busy || !roles.teacher} onClick={onIssueGrade}>Issue</button>
          </div>

          <div>
            <h3>Mark Attendance</h3>
            <input placeholder="studentAddress" value={attStudentAddr} onChange={(e) => setAttStudentAddr(e.target.value)} />
            <input placeholder="courseId" value={attCourseId} onChange={(e) => setAttCourseId(e.target.value)} />
            <input type="date" value={attDate} onChange={(e) => setAttDate(e.target.value)} />
            <select value={attStatus} onChange={(e) => setAttStatus(e.target.value)}>
              <option>Present</option>
              <option>Absent</option>
              <option>Excused</option>
            </select>
            <input type="file" onChange={(e) => setAttFile(e.target.files?.[0] || null)} />
            <button disabled={busy || !roles.teacher} onClick={onMarkAttendance}>Mark</button>
          </div>

          <div>
            <h3>Finalize Record</h3>
            <input placeholder="studentAddress" value={issueStudentAddr} onChange={(e) => setIssueStudentAddr(e.target.value)} />
            <input placeholder="courseId" value={issueCourseId} onChange={(e) => setIssueCourseId(e.target.value)} />
            <button disabled={busy || !roles.registrar} onClick={onFinalize}>Finalize</button>
          </div>
        </div>
      </section>

      {/* Student */}
      <section className="card">
        <h2>Student</h2>
        <div className="grid">
          <div>
            <h3>View Grade</h3>
            <input placeholder="courseId" value={viewCourseId} onChange={(e) => setViewCourseId(e.target.value)} />
            <button disabled={busy} onClick={onViewRecord}>Fetch</button>
            {recordView && (
              <div className="box">
                <div><b>Grade:</b> {recordView.grade}</div>
                <div><b>Finalized:</b> {recordView.finalized ? "Yes" : "No"}</div>
                {recordView.ipfsHash && (
                  <div><a href={`https://ipfs.io/ipfs/${recordView.ipfsHash}`} target="_blank" rel="noreferrer">Transcript CID</a></div>
                )}
              </div>
            )}
          </div>

          <div>
            <h3>View Attendance</h3>
            <input placeholder="courseId" value={viewCourseId} onChange={(e) => setViewCourseId(e.target.value)} />
            <button disabled={busy} onClick={onViewAttendance}>Fetch</button>
            {attendanceView?.length > 0 && (
              <table className="table">
                <thead><tr><th>Date (UTC)</th><th>Status</th><th>Proof</th></tr></thead>
                <tbody>
                  {attendanceView.map((e, i) => (
                    <tr key={i}>
                      <td>{new Date(Number(e.date) * 1000).toISOString().slice(0, 10)}</td>
                      <td>{["Present", "Absent", "Excused"][Number(e.status)]}</td>
                      <td>{e.ipfsHash ? <a href={`https://ipfs.io/ipfs/${e.ipfsHash}`} target="_blank" rel="noreferrer">CID</a> : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>

      {/* Verifier */}
      <section className="card">
        <h2>Verifier</h2>
        <div className="grid">
          <div>
            <h3>Verify Transcript (pay exact fee)</h3>
            <input placeholder="studentAddress" value={verStudentAddr} onChange={(e) => setVerStudentAddr(e.target.value)} />
            <input placeholder="courseId" value={verCourseId} onChange={(e) => setVerCourseId(e.target.value)} />
            <div className="row small">Current fee: {ethers.formatEther(feeWei)} ETH</div>
            <button disabled={busy} onClick={onVerify}>Verify</button>
            {verifyResult && (
              <div className="box">
                <div><b>Grade:</b> {verifyResult.grade}</div>
                <div><b>Finalized:</b> {verifyResult.finalized ? "Yes" : "No"}</div>
                {verifyResult.ipfsHash && (
                  <div><a href={`https://ipfs.io/ipfs/${verifyResult.ipfsHash}`} target="_blank" rel="noreferrer">Transcript CID</a></div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <footer className="small center">Local-only demo • Ganache 1337 • IPFS Kubo</footer>
    </div>
  );
}