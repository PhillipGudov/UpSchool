import React, { useEffect, useMemo, useRef, useState } from "react";
import { ethers } from "ethers";
import { create as createIpfsClient } from "ipfs-http-client";
import abi from "./abi.json";
import "./index.css";

function Toasts({ toasts, onClose }) {
  return (
    <div className="toast-wrap" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`}>
          <div className="toast-row">
            <strong className="toast-title">{t.title}</strong>
            <button className="toast-x" onClick={() => onClose(t.id)} aria-label="Dismiss">×</button>
          </div>
          {t.body && <div className="toast-body">{t.body}</div>}
          {t.hash && (
            <div className="toast-body">
              <span className="mono">{t.hash.slice(0, 10)}…{t.hash.slice(-10)}</span>
              <button
                className="copy"
                onClick={() => navigator.clipboard.writeText(t.hash)}
                title="Copy tx hash"
              >
                Copy
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
  const IPFS_API = import.meta.env.VITE_IPFS_API || "http://127.0.0.1:5001";
  const LOCAL_GATEWAY = import.meta.env.VITE_IPFS_GATEWAY || "http://127.0.0.1:8080/ipfs/";

  const providerRef = useRef(null);
  const signerRef = useRef(null);
  const contractRef = useRef(null);
  const headerRef = useRef(null);

  const [ipfs, setIpfs] = useState(null);
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState("");
  const [roles, setRoles] = useState({
    registrar: false,
    teacher: false,
    student: false,
    verifier: true,
  });
  const [feeWei, setFeeWei] = useState("0");
  const [contractBalance, setContractBalance] = useState("0");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [toasts, setToasts] = useState([]);
  const pushToast = (t) => {
    const id = Math.random().toString(36).slice(2);
    const toast = { id, ...t };
    setToasts((x) => [...x, toast]);
    if (t.kind !== "pending") setTimeout(() => closeToast(id), 3500);
    return id;
  };
  const updateToast = (id, next) => setToasts((x) => x.map((t) => (t.id === id ? { ...t, ...next } : t)));
  const closeToast = (id) => setToasts((x) => x.filter((t) => t.id !== id));

  const [courseId, setCourseId] = useState("");
  const [courseName, setCourseName] = useState("");
  const [teacherAddr, setTeacherAddr] = useState("");
  const [studentAddr, setStudentAddr] = useState("");
  const [enrollCourseId, setEnrollCourseId] = useState("");
  const [newFeeEth, setNewFeeEth] = useState("");

  const [issueCourseId, setIssueCourseId] = useState("");
  const [issueStudentAddr, setIssueStudentAddr] = useState("");
  const [grade, setGrade] = useState("");
  const [gradeFile, setGradeFile] = useState(null);

  const [attCourseId, setAttCourseId] = useState("");
  const [attStudentAddr, setAttStudentAddr] = useState("");
  const [attDate, setAttDate] = useState(""); // yyyy-mm-dd
  const [attStatus, setAttStatus] = useState("Present");
  const [attFile, setAttFile] = useState(null);

  const [viewCourseId, setViewCourseId] = useState("");
  const [recordView, setRecordView] = useState(null);
  const [attendanceView, setAttendanceView] = useState([]);

  const [verStudentAddr, setVerStudentAddr] = useState("");
  const [verCourseId, setVerCourseId] = useState("");
  const [verifyResult, setVerifyResult] = useState(null);

  const REGISTRAR_ROLE = useMemo(
    () => ethers.keccak256(ethers.toUtf8Bytes("REGISTRAR_ROLE")),
    []
  );
  const TEACHER_ROLE = useMemo(
    () => ethers.keccak256(ethers.toUtf8Bytes("TEACHER_ROLE")),
    []
  );

  useEffect(() => {
    try {
      setIpfs(createIpfsClient({ url: IPFS_API }));
    } catch (e) {
      setError("Failed to create IPFS client. Check VITE_IPFS_API.");
    }
  }, [IPFS_API]);

  useEffect(() => {
    const onScroll = () => {
      const h = headerRef.current;
      if (!h) return;
      if (window.scrollY > 4) h.classList.add("elevated");
      else h.classList.remove("elevated");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const connect = async () => {
    setError("");
    if (!window.ethereum) return setError("MetaMask not found.");
    if (!CONTRACT_ADDRESS) return setError("VITE_CONTRACT_ADDRESS missing in .env");

    const provider = new ethers.BrowserProvider(window.ethereum);
    providerRef.current = provider;

    const [addr] = await window.ethereum.request({ method: "eth_requestAccounts" });
    setAccount(addr);

    const network = await provider.getNetwork();
    setChainId(network.chainId ? Number(network.chainId) : "");

    const signer = await provider.getSigner();
    signerRef.current = signer;

    contractRef.current = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);

    await refreshBasics(addr);
  };

  const refreshBasics = async (addrOverride) => {
    try {
      const c = contractRef.current;
      const provider = providerRef.current;
      const addr = addrOverride || account;
      if (!c || !provider || !addr) return;

      const [isReg, isTeach, isStud, fee, balWei, net] = await Promise.all([
        c.hasRole(REGISTRAR_ROLE, addr),
        c.hasRole(TEACHER_ROLE, addr),
        c.registeredStudents(addr),
        c.verificationFee(),
        provider.getBalance(CONTRACT_ADDRESS),
        provider.getNetwork(),
      ]);

      setRoles({
        registrar: Boolean(isReg),
        teacher: Boolean(isTeach),
        student: Boolean(isStud),
        verifier: true,
      });
      setFeeWei(fee.toString());
      setContractBalance(ethers.formatEther(balWei));
      setChainId(net.chainId ? Number(net.chainId) : "");
    } catch (e) {
      setError(e.shortMessage || e.message);
    }
  };

  useEffect(() => {
    if (!window.ethereum) return;
    const handler = () => connect().catch((e) => setError(e.message));
    window.ethereum.on?.("accountsChanged", handler);
    window.ethereum.on?.("chainChanged", handler);
    return () => {
      window.ethereum.removeListener?.("accountsChanged", handler);
      window.ethereum.removeListener?.("chainChanged", handler);
    };
  }, []);

  useEffect(() => {
    connect().catch((e) => setError(e.message));
  }, []);

  const runTx = async (fn, label = "Transaction") => {
    setError("");
    setBusy(true);
    let tid;
    try {
      const tx = await fn();
      tid = pushToast({ kind: "pending", title: `${label}: pending`, hash: tx.hash });
      const rc = await tx.wait();
      updateToast(tid, { kind: rc.status === 1 ? "success" : "error", title: `${label}: ${rc.status === 1 ? "success" : "reverted"}` });
      await refreshBasics();
    } catch (e) {
      if (tid) updateToast(tid, { kind: "error", title: `${label}: failed`, body: e.shortMessage || e.message });
      else pushToast({ kind: "error", title: `${label}: failed`, body: e.shortMessage || e.message });
      setError(e.shortMessage || e.message);
    } finally {
      setBusy(false);
    }
  };

  const uploadToIPFS = async (file) => {
    if (!file || !ipfs) return "";
    const res = await ipfs.add(file);
    const cid = res?.cid?.toString() || "";
    if (cid) {
      pushToast({ kind: "success", title: "IPFS upload complete", body: cid });
    }
    return cid;
  };

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 86;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  const short = (s) => (s ? `${s.slice(0, 6)}…${s.slice(-4)}` : "");

  const onAddCourse = () =>
    runTx(
      () =>
        contractRef.current.addCourse(
          BigInt(courseId || "0"),
          courseName || "",
          teacherAddr || ethers.ZeroAddress
        ),
      "Add course"
    );

  const onRegisterStudent = () =>
    runTx(
      () => contractRef.current.registerStudent(studentAddr || ethers.ZeroAddress),
      "Register student"
    );

  const onEnroll = () =>
    runTx(
      () =>
        contractRef.current.enrollInCourse(
          studentAddr || ethers.ZeroAddress,
          BigInt(enrollCourseId || "0")
        ),
      "Enroll student"
    );

  const onSetFee = () =>
    runTx(
      () => contractRef.current.setVerificationFee(ethers.parseEther(newFeeEth || "0")),
      "Set verification fee"
    );

  const onWithdraw = () => runTx(() => contractRef.current.withdrawFees(), "Withdraw fees");

  const onIssueGrade = async () => {
    const ipfsHash = await uploadToIPFS(gradeFile);
    return runTx(
      () =>
        contractRef.current.issueGrade(
          issueStudentAddr || ethers.ZeroAddress,
          BigInt(issueCourseId || "0"),
          grade || "",
          ipfsHash
        ),
      "Issue grade"
    );
  };

  const onMarkAttendance = async () => {
    const ipfsHash = await uploadToIPFS(attFile);
    const ts = attDate ? Math.floor(new Date(`${attDate}T00:00:00Z`).getTime() / 1000) : 0;
    return runTx(
      () =>
        contractRef.current.markAttendance(
          attStudentAddr || ethers.ZeroAddress,
          BigInt(attCourseId || "0"),
          BigInt(ts),
          { Present: 0, Absent: 1, Excused: 2 }[attStatus] ?? 0,
          ipfsHash
        ),
      "Mark attendance"
    );
  };

  const onFinalize = () =>
    runTx(
      () =>
        contractRef.current.finalizeRecord(
          issueStudentAddr || ethers.ZeroAddress,
          BigInt(issueCourseId || "0")
        ),
      "Finalize record"
    );

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

  const onVerify = async () => {
    setError("");
    setVerifyResult(null);
    try {
      const fee = await contractRef.current.verificationFee();
      await runTx(
        () =>
          contractRef.current.verifyTranscript(
            verStudentAddr || ethers.ZeroAddress,
            BigInt(verCourseId || "0"),
            { value: fee }
          ),
        "Verify transcript"
      );
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

  const onGanache = Number(chainId) === 1337;
  const feeEth = ethers.formatEther(feeWei || "0");

  return (
    <div className="container">
      <Toasts toasts={toasts} onClose={closeToast} />

      <header className="card header" ref={headerRef}>
        <div className="row topbar">
          <div className="brand">
            <img src="/logo.png" alt="UpSchool" className="brand-logo" />
            <h1 className="brand-title">UpSchool Interface</h1>
            <span className={`net-badge ${onGanache ? "ok" : "warn"}`}>
              {onGanache ? "Ganache (1337)" : `Chain ${chainId || "?"}`}
            </span>
          </div>

          <div className="right-actions">
            <span className="addr-badge" title={CONTRACT_ADDRESS}>
              Contract: <span className="mono">{short(CONTRACT_ADDRESS || "")}</span>
              <button
                className="copy"
                onClick={() => navigator.clipboard.writeText(CONTRACT_ADDRESS || "")}
                title="Copy contract address"
              >
                Copy
              </button>
            </span>

            <button disabled={busy} onClick={() => connect().catch((e) => setError(e.message))}>
              {account ? `Connected: ${short(account)}` : "Connect Wallet"}
            </button>
          </div>
        </div>

        <div className="row roles">
          <span>Roles:</span>
          <button className={`pill link ${roles.registrar ? "ok" : ""}`} onClick={() => scrollTo("registrar")}>📘 Registrar</button>
          <button className={`pill link ${roles.teacher ? "ok" : ""}`}   onClick={() => scrollTo("teacher")}>🧑‍🏫 Teacher</button>
          <button className={`pill link ${roles.student ? "ok" : ""}`}   onClick={() => scrollTo("student")}>🎓 Student</button>
          <button className={`pill link ${roles.verifier ? "ok" : ""}`}  onClick={() => scrollTo("verifier")}>✅ Verifier</button>
        </div>

        <div className="row small meta">
          <span>Verification Fee: <b>{feeEth}</b> ETH</span>
          <span>Contract Balance: <b>{contractBalance}</b> ETH</span>
        </div>

        {error && <div className="error">Error: {error}</div>}
      </header>

      {/* Registrar */}
      <section id="registrar" className="card section">
        <h2>Registrar</h2>
        <div className="divider" />
        <div className="grid">
          <div>
            <h3>Add Course</h3>
            <input placeholder="courseId" value={courseId} onChange={(e) => setCourseId(e.target.value)} />
            <input placeholder="courseName" value={courseName} onChange={(e) => setCourseName(e.target.value)} />
            <input placeholder="teacherAddress (0x…)" value={teacherAddr} onChange={(e) => setTeacherAddr(e.target.value)} />
            <div className="hint">Teacher must be a valid address</div>
            <button
              disabled={busy || !roles.registrar || !courseId || !courseName || !ethers.isAddress(teacherAddr || "")}
              onClick={onAddCourse}
            >
              Add Course
            </button>
          </div>

          <div>
            <h3>Register Student</h3>
            <input placeholder="studentAddress (0x…)" value={studentAddr} onChange={(e) => setStudentAddr(e.target.value)} />
            <div className="hint">Registers the address as a student</div>
            <button disabled={busy || !roles.registrar || !ethers.isAddress(studentAddr || "")} onClick={onRegisterStudent}>
              Register
            </button>
          </div>

          <div>
            <h3>Enroll Student</h3>
            <input placeholder="studentAddress (0x…)" value={studentAddr} onChange={(e) => setStudentAddr(e.target.value)} />
            <input placeholder="courseId" value={enrollCourseId} onChange={(e) => setEnrollCourseId(e.target.value)} />
            <div className="hint">Enrolls a registered student into a selected course</div>
            <button disabled={busy || !roles.registrar || !ethers.isAddress(studentAddr || "") || !enrollCourseId} onClick={onEnroll}>
              Enroll
            </button>
          </div>

          <div>
            <h3>Set Verification Fee</h3>
            <input placeholder="fee (ETH, e.g. 0.01)" value={newFeeEth} onChange={(e) => setNewFeeEth(e.target.value)} />
            <div className="hint">Exact fee required by verifiers</div>
            <button disabled={busy || !roles.registrar || !newFeeEth} onClick={onSetFee}>Set Fee</button>
          </div>

          <div>
            <h3>Withdraw Fees</h3>
            <div className="hint">Send all collected fees to the treasury</div>
            <button disabled={busy || !roles.registrar} onClick={onWithdraw}>Withdraw</button>
          </div>
        </div>
      </section>

      {/* Teacher */}
      <section id="teacher" className="card section">
        <h2>Teacher</h2>
        <div className="divider" />
        <div className="grid">
          <div>
            <h3>Issue Grade</h3>
            <input placeholder="studentAddress (0x…)" value={issueStudentAddr} onChange={(e) => setIssueStudentAddr(e.target.value)} />
            <input placeholder="courseId" value={issueCourseId} onChange={(e) => setIssueCourseId(e.target.value)} />
            <input placeholder="grade (e.g., A or 95%)" value={grade} onChange={(e) => setGrade(e.target.value)} />
            <input type="file" onChange={(e) => setGradeFile(e.target.files?.[0] || null)} />
            <div className="hint">Optional proof file uploaded to IPFS</div>
            <button
              disabled={busy || !roles.teacher || !ethers.isAddress(issueStudentAddr || "") || !issueCourseId || !grade}
              onClick={onIssueGrade}
            >
              Issue
            </button>
          </div>

          <div>
            <h3>Mark Attendance</h3>
            <input placeholder="studentAddress (0x…)" value={attStudentAddr} onChange={(e) => setAttStudentAddr(e.target.value)} />
            <input placeholder="courseId" value={attCourseId} onChange={(e) => setAttCourseId(e.target.value)} />
            <input type="date" value={attDate} onChange={(e) => setAttDate(e.target.value)} />
            <select value={attStatus} onChange={(e) => setAttStatus(e.target.value)}>
              <option>Present</option>
              <option>Absent</option>
              <option>Excused</option>
            </select>
            <input type="file" onChange={(e) => setAttFile(e.target.files?.[0] || null)} />
            <div className="hint">Records a student’s attendance for a specific class date</div>
            <button
              disabled={busy || !roles.teacher || !ethers.isAddress(attStudentAddr || "") || !attCourseId || !attDate}
              onClick={onMarkAttendance}
            >
              Mark
            </button>
          </div>

          <div>
            <h3>Finalize Record</h3>
            <input placeholder="studentAddress (0x…)" value={issueStudentAddr} onChange={(e) => setIssueStudentAddr(e.target.value)} />
            <input placeholder="courseId" value={issueCourseId} onChange={(e) => setIssueCourseId(e.target.value)} />
            <div className="hint">Only registrar can finalize</div>
            <button disabled={busy || !roles.registrar || !ethers.isAddress(issueStudentAddr || "") || !issueCourseId} onClick={onFinalize}>
              Finalize
            </button>
          </div>
        </div>
      </section>

      {/* Student */}
      <section id="student" className="card section">
        <h2>Student</h2>
        <div className="divider" />
        <div className="grid">
          <div>
            <h3>View Grade</h3>
            <input placeholder="courseId" value={viewCourseId} onChange={(e) => setViewCourseId(e.target.value)} />
            <div className="hint">Retrieve your final grade and linked IPFS transcript</div>
            <button disabled={busy || !viewCourseId} onClick={onViewRecord}>Fetch</button>
            {recordView && (
              <div className="box">
                <div><b>Grade:</b> {recordView.grade}</div>
                <div><b>Finalized:</b> {recordView.finalized ? "Yes" : "No"}</div>
                {recordView.ipfsHash && (
                  <div className="cid">
                    <span className="mono">{recordView.ipfsHash}</span>
                    <button className="copy" onClick={() => navigator.clipboard.writeText(recordView.ipfsHash)}>Copy CID</button>
                    <a href={`${LOCAL_GATEWAY}${recordView.ipfsHash}`} target="_blank" rel="noreferrer">Local</a>
                    <a href={`https://ipfs.io/ipfs/${recordView.ipfsHash}`} target="_blank" rel="noreferrer">Public</a>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <h3>View Attendance</h3>
            <input placeholder="courseId" value={viewCourseId} onChange={(e) => setViewCourseId(e.target.value)} />
            <div className="hint">View your full attendance history for a selected course</div>
            <button disabled={busy || !viewCourseId} onClick={onViewAttendance}>Fetch</button>
            {attendanceView?.length > 0 && (
              <table className="table zebra">
                <thead><tr><th>Date (UTC)</th><th>Status</th><th>Proof</th></tr></thead>
                <tbody>
                  {attendanceView.map((e, i) => (
                    <tr key={i}>
                      <td>{new Date(Number(e.date) * 1000).toISOString().slice(0, 10)}</td>
                      <td>{["Present", "Absent", "Excused"][Number(e.status)]}</td>
                      <td>{e.ipfsHash ? (
                        <div className="cid">
                          <a href={`${LOCAL_GATEWAY}${e.ipfsHash}`} target="_blank" rel="noreferrer">Local</a>
                          <a href={`https://ipfs.io/ipfs/${e.ipfsHash}`} target="_blank" rel="noreferrer">Public</a>
                        </div>
                      ) : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>

      {/* Verifier */}
      <section id="verifier" className="card section">
        <h2>Verifier</h2>
        <div className="divider" />
        <div className="grid">
          <div>
            <h3>Verify Transcript (pay exact fee)</h3>
            <input placeholder="studentAddress (0x…)" value={verStudentAddr} onChange={(e) => setVerStudentAddr(e.target.value)} />
            <input placeholder="courseId" value={verCourseId} onChange={(e) => setVerCourseId(e.target.value)} />
            <div className="row small">Current fee: <b>{feeEth}</b> ETH</div>
            <div className="hint">Verify a student’s transcript authenticity using the official fee</div>
            <button disabled={busy || !ethers.isAddress(verStudentAddr || "") || !verCourseId} onClick={onVerify}>Verify</button>
            {verifyResult && (
              <div className="box">
                <div><b>Grade:</b> {verifyResult.grade}</div>
                <div><b>Finalized:</b> {verifyResult.finalized ? "Yes" : "No"}</div>
                {verifyResult.ipfsHash && (
                  <div className="cid">
                    <span className="mono">{verifyResult.ipfsHash}</span>
                    <button className="copy" onClick={() => navigator.clipboard.writeText(verifyResult.ipfsHash)}>Copy CID</button>
                    <a href={`${LOCAL_GATEWAY}${verifyResult.ipfsHash}`} target="_blank" rel="noreferrer">Local</a>
                    <a href={`https://ipfs.io/ipfs/${verifyResult.ipfsHash}`} target="_blank" rel="noreferrer">Public</a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <footer className="small center">© UpSchool • Phillip Gudov, Zachary James, Tai Pham</footer>
    </div>
  );
}