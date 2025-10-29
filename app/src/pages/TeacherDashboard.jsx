// app/src/pages/TeacherDashboard.jsx
import React, { useContext, useState } from 'react';
import { Web3Context } from '../components/Web3Provider';
import { create } from 'ipfs-http-client';

const ipfs = create({ url: 'http://localhost:5001/api/v0' });

export default function TeacherDashboard() {
  const { contract, currentAccount } = useContext(Web3Context);
  const [studentAddress, setStudentAddress] = useState("");
  const [attendanceFile, setAttendanceFile] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");

  const handleAttendanceUpload = async (e) => {
    e.preventDefault();
    if (!studentAddress || !attendanceFile) return;
    try {
      const added = await ipfs.add(attendanceFile);
      const ipfsHash = added.path;
      await contract.methods.recordAttendance(studentAddress, ipfsHash).send({ from: currentAccount });
      setStatusMessage(`Recorded attendance for ${studentAddress}. IPFS hash: ${ipfsHash}`);
    } catch (err) {
      console.error(err);
      setStatusMessage("Error recording attendance.");
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Teacher Dashboard</h2>
      <form onSubmit={handleAttendanceUpload} className="p-4 border border-gray-300 rounded">
        <h3 className="font-semibold mb-2">Record Attendance</h3>
        <div className="mb-2">
          <label className="block mb-1">Student Address:</label>
          <input 
            type="text" 
            value={studentAddress} 
            onChange={e => setStudentAddress(e.target.value)} 
            className="w-full p-2 border"
            placeholder="Student's address"
            required 
          />
        </div>
        <div className="mb-2">
          <label className="block mb-1">Attendance File:</label>
          <input 
            type="file" 
            onChange={e => setAttendanceFile(e.target.files[0])} 
            className="block w-full text-sm"
            required 
          />
        </div>
        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">Upload to IPFS & Save</button>
      </form>
      {statusMessage && <div className="mt-4 p-2 bg-gray-100 text-center">{statusMessage}</div>}
    </div>
  );
}