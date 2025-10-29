// app/src/pages/RegistrarDashboard.jsx
import React, { useContext, useState } from 'react';
import { Web3Context } from '../components/Web3Provider';
// For IPFS, using the IPFS HTTP client
import { create } from 'ipfs-http-client';

const ipfs = create({ url: 'http://localhost:5001/api/v0' }); 
// Ensure your IPFS daemon (Kubo) is running and CORS is configured to allow this origin.

export default function RegistrarDashboard() {
  const { contract, currentAccount } = useContext(Web3Context);
  const [newUserAddress, setNewUserAddress] = useState("");
  const [newUserRole, setNewUserRole] = useState("STUDENT"); // default role selection
  const [uploadStudentAddress, setUploadStudentAddress] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");

  // Handler to register a new user with selected role
  const handleRegisterUser = async (e) => {
    e.preventDefault();
    if (!newUserAddress) return;
    try {
      if (newUserRole === "STUDENT") {
        await contract.methods.registerStudent(newUserAddress).send({ from: currentAccount });
      } else if (newUserRole === "TEACHER") {
        await contract.methods.registerTeacher(newUserAddress).send({ from: currentAccount });
      } else if (newUserRole === "VERIFIER") {
        await contract.methods.registerVerifier(newUserAddress).send({ from: currentAccount });
      }
      setStatusMessage(`Successfully added ${newUserRole}: ${newUserAddress}`);
    } catch (err) {
      console.error(err);
      setStatusMessage("Error registering user (check console).");
    }
  };

  // Handler to upload transcript file to IPFS and send hash to contract
  const handleUploadTranscript = async (e) => {
    e.preventDefault();
    if (!uploadStudentAddress || !uploadFile) return;
    try {
      // 1. Upload file to IPFS
      const added = await ipfs.add(uploadFile);
      const ipfsHash = added.path;  // 'path' contains the CID string in ipfs-http-client
      // 2. Call smart contract to store this hash for the student
      await contract.methods.uploadTranscript(uploadStudentAddress, ipfsHash).send({ from: currentAccount });
      setStatusMessage(`Transcript uploaded for student ${uploadStudentAddress}: IPFS hash ${ipfsHash}`);
    } catch (err) {
      console.error("IPFS/Upload error", err);
      setStatusMessage("Error uploading transcript (check console).");
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Registrar Dashboard</h2>

      {/* Form: Register new user */}
      <form onSubmit={handleRegisterUser} className="mb-6 p-4 border border-gray-300 rounded">
        <h3 className="font-semibold mb-2">Add New User</h3>
        <div className="mb-2">
          <label className="block mb-1">User Ethereum Address:</label>
          <input 
            type="text" 
            value={newUserAddress} 
            onChange={e => setNewUserAddress(e.target.value)} 
            className="w-full p-2 border"
            placeholder="0x1234...abcd"
            required 
          />
        </div>
        <div className="mb-2">
          <label className="block mb-1">Role:</label>
          <select value={newUserRole} onChange={e => setNewUserRole(e.target.value)} className="p-2 border">
            <option value="STUDENT">Student</option>
            <option value="TEACHER">Teacher</option>
            <option value="VERIFIER">Verifier</option>
          </select>
        </div>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Register User</button>
      </form>

      {/* Form: Upload Transcript */}
      <form onSubmit={handleUploadTranscript} className="mb-6 p-4 border border-gray-300 rounded">
        <h3 className="font-semibold mb-2">Upload Transcript</h3>
        <div className="mb-2">
          <label className="block mb-1">Student Address:</label>
          <input 
            type="text" 
            value={uploadStudentAddress} 
            onChange={e => setUploadStudentAddress(e.target.value)} 
            className="w-full p-2 border"
            placeholder="Student's address (must be registered)"
            required 
          />
        </div>
        <div className="mb-2">
          <label className="block mb-1">Transcript File:</label>
          <input 
            type="file" 
            onChange={e => setUploadFile(e.target.files[0])}
            className="block w-full text-sm text-gray-600"
            required 
          />
        </div>
        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">Upload to IPFS & Save</button>
      </form>

      {statusMessage && <div className="p-2 bg-gray-100 text-center">{statusMessage}</div>}
    </div>
  );
}