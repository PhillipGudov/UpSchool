// app/src/pages/StudentDashboard.jsx
import React, { useContext, useEffect, useState } from 'react';
import { Web3Context } from '../components/Web3Provider';

export default function StudentDashboard() {
  const { contract, currentAccount } = useContext(Web3Context);
  const [transcriptHash, setTranscriptHash] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [attendanceHash, setAttendanceHash] = useState("");

  useEffect(() => {
    async function fetchRecords() {
      if (!contract || !currentAccount) return;
      try {
        // Call getTranscript (as student, we are allowed to get our own)
        const result = await contract.methods.getTranscript(currentAccount).call({ from: currentAccount });
        const [ipfsHash, verified] = result;
        setTranscriptHash(ipfsHash);
        setIsVerified(verified);
      } catch (err) {
        console.error("Error fetching transcript", err);
      }
      try {
        const attendance = await contract.methods.getAttendance(currentAccount).call({ from: currentAccount });
        setAttendanceHash(attendance);
      } catch (err) {
        console.error("Error fetching attendance", err);
      }
    }
    fetchRecords();
  }, [contract, currentAccount]);

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-4">Student Dashboard</h2>
      <div className="mb-4 p-4 border rounded">
        <h3 className="font-semibold mb-2">My Transcript</h3>
        {transcriptHash ? (
          <div>
            <p><strong>IPFS Hash:</strong> {transcriptHash}</p>
            <p><strong>Status:</strong> {isVerified ? "✅ Verified" : "❌ Not Verified"}</p>
            {/* Link to view the file via an IPFS gateway (using a public gateway or local if configured) */}
            <a 
              href={`https://ipfs.io/ipfs/${transcriptHash}`} 
              target="_blank" rel="noopener noreferrer" 
              className="text-blue-600 underline"
            >
              View Transcript File
            </a>
          </div>
        ) : (
          <p>No transcript uploaded yet.</p>
        )}
      </div>
      <div className="mb-4 p-4 border rounded">
        <h3 className="font-semibold mb-2">My Attendance Record</h3>
        {attendanceHash ? (
          <div>
            <p><strong>IPFS Hash:</strong> {attendanceHash}</p>
            <a 
              href={`https://ipfs.io/ipfs/${attendanceHash}`} 
              target="_blank" rel="noopener noreferrer" 
              className="text-blue-600 underline"
            >
              View Attendance File
            </a>
          </div>
        ) : (
          <p>No attendance record found.</p>
        )}
      </div>
      <p className="text-sm text-gray-600">
        * Note: Clicking "View" will open the file from an IPFS gateway. Ensure your IPFS node is running or use a public gateway.
      </p>
    </div>
  );
}