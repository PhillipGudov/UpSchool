// app/src/pages/TeacherDashboard.jsx
import React, { useContext, useState } from "react";
import { Web3Ctx } from "../blockchain/Web3Provider.jsx";
import { useRoles } from "../blockchain/useRoles.js";
import RoleGuard from "../components/RoleGuard.jsx";

export default function TeacherDashboard() {
  const { contract, account } = useContext(Web3Ctx);
  const { isTeacher, loading } = useRoles();

  const [issueForm, setIssueForm] = useState({ student:"", courseId:"", grade:"", ipfsHash:"" });
  const [attForm, setAttForm] = useState({ student:"", courseId:"", status:"Present", ipfsHash:"" });
  const [txMsg, setTxMsg] = useState("");

  if (loading) return <p>Loading role…</p>;

  const handleIssue = async (e) => {
    e.preventDefault();
    setTxMsg("Sending transaction…");
    try {
      const { student, courseId, grade, ipfsHash } = issueForm;
      await contract.methods.issueGrade(student, Number(courseId), grade, ipfsHash).send({ from: account });
      setTxMsg("✅ Grade issued");
    } catch (err) {
      setTxMsg(`❌ ${err.message}`);
    }
  };

  const handleAttendance = async (e) => {
    e.preventDefault();
    setTxMsg("Sending transaction…");
    try {
      const { student, courseId, status, ipfsHash } = attForm;
      // assuming enum Status { Absent=0, Present=1, Excused=2 } or similar; adjust if different
      const statusMap = { Absent:0, Present:1, Excused:2 };
      await contract.methods.markAttendance(student, Number(courseId), statusMap[status], ipfsHash).send({ from: account });
      setTxMsg("✅ Attendance marked");
    } catch (err) {
      setTxMsg(`❌ ${err.message}`);
    }
  };

  return (
    <RoleGuard allowed={isTeacher}>
      <h2>Teacher Dashboard</h2>
      <p>Connected as: <b>{account}</b></p>

      <div style={{display:"grid", gap:24}}>
        <form onSubmit={handleIssue} style={card}>
          <h3>Issue Grade</h3>
          <Row label="Student">
            <input required placeholder="0x..." value={issueForm.student}
              onChange={e=>setIssueForm({...issueForm, student:e.target.value})}/>
          </Row>
          <Row label="Course ID">
            <input required type="number" value={issueForm.courseId}
              onChange={e=>setIssueForm({...issueForm, courseId:e.target.value})}/>
          </Row>
          <Row label="Grade">
            <input required placeholder="A / B+ / 95" value={issueForm.grade}
              onChange={e=>setIssueForm({...issueForm, grade:e.target.value})}/>
          </Row>
          <Row label="IPFS CID (optional)">
            <input placeholder="bafy..." value={issueForm.ipfsHash}
              onChange={e=>setIssueForm({...issueForm, ipfsHash:e.target.value})}/>
          </Row>
          <button>Submit</button>
        </form>

        <form onSubmit={handleAttendance} style={card}>
          <h3>Mark Attendance</h3>
          <Row label="Student">
            <input required placeholder="0x..." value={attForm.student}
              onChange={e=>setAttForm({...attForm, student:e.target.value})}/>
          </Row>
          <Row label="Course ID">
            <input required type="number" value={attForm.courseId}
              onChange={e=>setAttForm({...attForm, courseId:e.target.value})}/>
          </Row>
          <Row label="Status">
            <select value={attForm.status} onChange={e=>setAttForm({...attForm, status:e.target.value})}>
              <option>Present</option><option>Absent</option><option>Excused</option>
            </select>
          </Row>
          <Row label="IPFS CID (optional)">
            <input placeholder="bafy..." value={attForm.ipfsHash}
              onChange={e=>setAttForm({...attForm, ipfsHash:e.target.value})}/>
          </Row>
          <button>Submit</button>
        </form>
      </div>

      {txMsg && <p>{txMsg}</p>}
    </RoleGuard>
  );
}

const card = { border:"1px solid #eee", borderRadius:12, padding:16 };
function Row({label, children}) {
  return (
    <label style={{display:"grid", gap:8, marginBottom:12}}>
      <span style={{fontSize:12, color:"#555"}}>{label}</span>
      {children}
    </label>
  );
}