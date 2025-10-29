// src/App.jsx
// ────────────
import { useEffect, useMemo, useRef, useState } from "react";
import { ethers } from "ethers";
import { create as createIpfsClient } from "ipfs-http-client";
import abi from "./abi.json";
import "./index.css";

// Small helpers inside the one file to keep structure tiny.
const STATUS = { Present: 0, Absent: 1, Excused: 2 };

export default function App() {
  // ── ENV & singletons
  const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS; // required
  const IPFS_API = import.meta.env.VITE_IPFS_API || "http://127.0.0.1:5001";
  const providerRef = useRef(null);
  const signerRef = useRef(null);
  const contractRef = useRef(null);
  const [ipfs, setIpfs] = useState(null);

  // ── UI state
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
  const [viewRecord, setViewRecord] = useState(null);
  const [viewAttendance, setViewAttendance] = useState([]);

  // Verifier
  const [verStudentAddr, setVerStudentAddr] = useState("");
  const [verCourseId, setVerCourseId] = useState("");
  const [verifyResult, setVerifyResult] = useState(null);

  // precomputed role IDs
  const REGISTRAR_ROLE = useMemo(
    () => ethers.keccak256(ethers.toUtf8Bytes("REGISTRAR_ROLE")),
    []
  );
  const TEACHER_ROLE = useMemo(
    () => ethers.keccak256(ethers.toUtf8Bytes("TEACHER_ROLE")),
    []
  );

  // ── initialize IPFS client
  useEffect(() => {
    try {
      setIpfs(createIpfsClient({ url: IPFS_API }));
    } catch (e) {
      console.warn("IPFS client init error", e);
    }
  }, [IPFS_API]);

  // ── connect Metamask + contract
  const ensureConnected = async () => {
    if (!window.ethereum) throw new Error("MetaMask not found");
    const provider = new ethers.BrowserProvider(window.ethereum);
    providerRef.current = provider;
    const [addr] = await window.ethereum.request({ method: "eth_requestAccounts" });
    setAccount(addr);
    signerRef.current = await provider.getSigner();
    if (!CONTRACT_ADDRESS) throw new Error("VITE_CONTRACT_ADDRESS not set");
    contractRef.current = new ethers.Contract(CONTRACT_ADDRESS, abi, signerRef.current);
    await refreshBasics();
  };

  // ── refresh roles, fee, balance
  const refreshBasics = async () => {
    setError("");
    try {
      if (!providerRef.current || !contractRef.current) return;
      const c = contractRef.current;

      // roles
      const [isReg, isTeach] = await Promise.all([
        c.hasRole(REGISTRAR_ROLE, account),
        c.hasRole(TEACHER_ROLE, account),
      ]);
      setRoles({ registrar: isReg, teacher: isTeach });

      // fee + contract balance
      const fee = await c.verificationFee();
      setFeeWei(fee.toString());

      const bal = await providerRef.current.getBalance(CONTRACT_ADDRESS);
      setContractBalance(ethers.formatEther(bal));
    } catch (e) {
      setError(e.message);
    }
  };

  // react to account or network changes
  useEffect(() => {
    if (!window.ethereum) return;
    const onAcc = () => ensureConnected().catch(setError);
    const onChain = () => ensureConnected().catch(setError);
    window.ethereum.on?.("accountsChanged", onAcc);
    window.ethereum.on?.("chainChanged", onChain);
    return () => {
      window.ethereum.removeListener?.("accountsChanged", onAcc);
      window.ethereum.removeListener?.("chainChanged", onChain);
    };
  }, []);

  // one-shot connect on mount
  useEffect(() => {
    ensureConnected().catch(setError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── utils
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
    const added = await ipfs.add(file);
    return added.cid?.toString() || "";
  };

  // ── Registrar actions
  const onAddCourse = () =>
    runTx(async () => contractRef.current.addCourse(
      BigInt(courseId),
      courseName,
      teacherAddr
    ));

  const onRegisterStudent = () =>
    runTx(async () => contractRef.current.registerStudent(studentAddr));

  const onEnroll = () =>
    runTx(async () => contractRef.current.enrollInCourse(
      studentAddr, BigInt(enrollCourseId)
    ));

  const onSetFee = () =>
    runTx(async () => {
      // newFeeEth string → wei bigint
      const wei = ethers.parseEther(newFeeEth || "0");
      return contractRef.current.setVerificationFee(wei);
    });

  const onWithdraw = () => runTx(async () => contractRef.current.withdrawFees());

  // ── Teacher actions
  const onIssueGrade = async () => {
    const ipfsHash = await uploadToIPFS(gradeFile);
    return runTx(async () =>
      contractRef.current.issueGrade(
        issueStudentAddr,
        BigInt(issueCourseId),
        grade,
        ipfsHash
      )
    );
  };

  const onMarkAttendance = async () => {
    const ipfsHash = await uploadToIPFS(attFile);
    // convert yyyy-mm-dd to UTC midnight timestamp
    const ts = attDate ? Math.floor(new Date(attDate + "T00:00:00Z").getTime() / 1000) : 0;
    const statusVal = STATUS[attStatus] ?? 0;
    return runTx(async () =>
      contractRef.current.markAttendance(
        attStudentAddr,
        BigInt(attCourseId),
        BigInt(ts),
        statusVal,
        ipfsHash
      )
    );
  };

  const onFinalize = () =>
    runTx(async () =>
      contractRef.current.finalizeRecord(issueStudentAddr, BigInt(issueCourseId))
    );

  // ── Student views
  const onViewRecord = async () => {
    setError("");
    setViewRecord(null);
    try {
      const rec = await contractRef.current.viewRecord(account || studentAddr, BigInt(viewCourseId));
      setViewRecord(rec);
    } catch (e) {
      setError(e.message);
    }
  };

  const onViewAttendance = async () => {
    setError("");
    setViewAttendance([]);
    try {
      const arr = await contractRef.current.viewAttendance(account || studentAddr, BigInt(viewCourseId));
      setViewAttendance(arr);
    } catch (e) {
      setError(e.message);
    }
  };

  // ── Verifier
  const onVerify = async () => {
    setVerifyResult(null);
    try {
      const fee = await contractRef.current.verificationFee();
      const tx = await contractRef.current.verifyTranscript(
        verStudentAddr, BigInt(verCourseId), { value: fee }
      );
      const receipt = await tx.wait();
      setLastTx({ hash: receipt.hash, status: receipt.status === 1 ? "success" : "reverted" });
      // read again to display snapshot
      const rec = await contractRef.current.viewRecord(verStudentAddr, BigInt(verCourseId));
      setVerifyResult(rec);
      await refreshBasics();
    } catch (e) {
      setError(e.shortMessage || e.message);
      setLastTx((t) => ({ ...t, status: "error" }));
    }
  };

  // ── render
  return (
    <div className="container">
      <header className="card">
        <div className="row">
          <h1>PowerSchool DApp</h1>
          <button disabled={busy} onClick={() => ensureConnected().catch(setError)}>
            {account ? `Connected: ${account.slice(0, 6)}…${account.slice(-4)}` : "Connect Wallet"}
          </button>
        </div>
        <div className="row small">
          <span>Roles: </span>
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

      {/* Registrar Panel */}
      <section className="card">
        <h2>Registrar</h2>
        <div className="grid">
          <div>
            <h3>Add Course</h3>
            <input placeholder="courseId" value={courseId} onChange={e=>setCourseId(e.target.value)} />
            <input placeholder="courseName" value={courseName} onChange={e=>setCourseName(e.target.value)} />
            <input placeholder="teacherAddress" value={teacherAddr} onChange={e=>setTeacherAddr(e.target.value)} />
            <button disabled={busy || !roles.registrar} onClick={onAddCourse}>Add Course</button>
          </div>

          <div>
            <h3>Register Student</h3>
            <input placeholder="studentAddress" value={studentAddr} onChange={e=>setStudentAddr(e.target.value)} />
            <button disabled={busy || !roles.registrar} onClick={onRegisterStudent}>Register</button>
          </div>

          <div>
            <h3>Enroll Student</h3>
            <input placeholder="studentAddress" value={studentAddr} onChange={e=>setStudentAddr(e.target.value)} />
            <input placeholder="courseId" value={enrollCourseId} onChange={e=>setEnrollCourseId(e.target.value)} />
            <button disabled={busy || !roles.registrar} onClick={onEnroll}>Enroll</button>
          </div>

          <div>
            <h3>Set Verification Fee</h3>
            <input placeholder="fee (ETH)" value={newFeeEth} onChange={e=>setNewFeeEth(e.target.value)} />
            <button disabled={busy || !roles.registrar} onClick={onSetFee}>Set Fee</button>
          </div>

          <div>
            <h3>Withdraw Contract Fees</h3>
            <button disabled={busy || !roles.registrar} onClick={onWithdraw}>Withdraw</button>
          </div>
        </div>
      </section>

      {/* Teacher Panel */}
      <section className="card">
        <h2>Teacher</h2>
        <div className="grid">
          <div>
            <h3>Issue Grade</h3>
            <input placeholder="studentAddress" value={issueStudentAddr} onChange={e=>setIssueStudentAddr(e.target.value)} />
            <input placeholder="courseId" value={issueCourseId} onChange={e=>setIssueCourseId(e.target.value)} />
            <input placeholder="grade (e.g., A or 95%)" value={grade} onChange={e=>setGrade(e.target.value)} />
            <input type="file" onChange={e=>setGradeFile(e.target.files?.[0] || null)} />
            <button disabled={busy || !roles.teacher} onClick={onIssueGrade}>Issue</button>
          </div>

          <div>
            <h3>Mark Attendance</h3>
            <input placeholder="studentAddress" value={attStudentAddr} onChange={e=>setAttStudentAddr(e.target.value)} />
            <input placeholder="courseId" value={attCourseId} onChange={e=>setAttCourseId(e.target.value)} />
            <input type="date" value={attDate} onChange={e=>setAttDate(e.target.value)} />
            <select value={attStatus} onChange={e=>setAttStatus(e.target.value)}>
              <option>Present</option><option>Absent</option><option>Excused</option>
            </select>
            <input type="file" onChange={e=>setAttFile(e.target.files?.[0] || null)} />
            <button disabled={busy || !roles.teacher} onClick={onMarkAttendance}>Mark</button>
          </div>

          <div>
            <h3>Finalize Record</h3>
            <input placeholder="studentAddress" value={issueStudentAddr} onChange={e=>setIssueStudentAddr(e.target.value)} />
            <input placeholder="courseId" value={issueCourseId} onChange={e=>setIssueCourseId(e.target.value)} />
            <button disabled={busy || !roles.registrar} onClick={onFinalize}>Finalize</button>
          </div>
        </div>
      </section>

      {/* Student Panel */}
      <section className="card">
        <h2>Student</h2>
        <div className="grid">
          <div>
            <h3>View Grade</h3>
            <input placeholder="courseId" value={viewCourseId} onChange={e=>setViewCourseId(e.target.value)} />
            <button disabled={busy} onClick={onViewRecord}>Fetch</button>
            {viewRecord && (
              <div className="box">
                <div><b>Grade:</b> {viewRecord.grade}</div>
                <div><b>Finalized:</b> {viewRecord.finalized ? "Yes" : "No"}</div>
                {viewRecord.ipfsHash && (
                  <div><a href={`https://ipfs.io/ipfs/${viewRecord.ipfsHash}`} target="_blank">Transcript CID</a></div>
                )}
              </div>
            )}
          </div>

          <div>
            <h3>View Attendance</h3>
            <input placeholder="courseId" value={viewCourseId} onChange={e=>setViewCourseId(e.target.value)} />
            <button disabled={busy} onClick={onViewAttendance}>Fetch</button>
            {viewAttendance?.length > 0 && (
              <table className="table">
                <thead><tr><th>Date (UTC)</th><th>Status</th><th>Proof</th></tr></thead>
                <tbody>
                  {viewAttendance.map((e, i) => (
                    <tr key={i}>
                      <td>{new Date(Number(e.date) * 1000).toISOString().slice(0,10)}</td>
                      <td>{["Present","Absent","Excused"][Number(e.status)]}</td>
                      <td>{e.ipfsHash ? <a href={`https://ipfs.io/ipfs/${e.ipfsHash}`} target="_blank">CID</a> : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>

      {/* Verifier Panel */}
      <section className="card">
        <h2>Verifier</h2>
        <div className="grid">
          <div>
            <h3>Verify Transcript (pay exact fee)</h3>
            <input placeholder="studentAddress" value={verStudentAddr} onChange={e=>setVerStudentAddr(e.target.value)} />
            <input placeholder="courseId" value={verCourseId} onChange={e=>setVerCourseId(e.target.value)} />
            <div className="row small">Current fee: {ethers.formatEther(feeWei)} ETH</div>
            <button disabled={busy} onClick={onVerify}>Verify</button>
            {verifyResult && (
              <div className="box">
                <div><b>Grade:</b> {verifyResult.grade}</div>
                <div><b>Finalized:</b> {verifyResult.finalized ? "Yes" : "No"}</div>
                {verifyResult.ipfsHash && (
                  <div><a href={`https://ipfs.io/ipfs/${verifyResult.ipfsHash}`} target="_blank">Transcript CID</a></div>
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