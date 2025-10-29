// app/src/pages/VerifierDashboard.jsx
import React, { useContext, useState } from 'react';
import { Web3Context } from '../components/Web3Provider';

export default function VerifierDashboard() {
  const { contract, currentAccount } = useContext(Web3Context);
  const [studentAddress, setStudentAddress] = useState("");
  const [transcriptHash, setTranscriptHash] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const handleLookup = async () => {
    if (!studentAddress) return;
    try {
      // Verifier can fetch transcript of any student
      const result = await contract.methods.getTranscript(studentAddress).call({ from: currentAccount });
      const [ipfsHash, verified] = result;
      setTranscriptHash(ipfsHash || "");
      if (ipfsHash) {
        setStatusMessage(verified ? "Transcript is already verified." : "Transcript is not verified yet.");
      } else {
        setStatusMessage("No transcript found for that address.");
      }
    } catch (err) {
      console.error(err);
      setStatusMessage("Error fetching transcript.");
    }
  };

  const handleVerify = async () => {
    if (!studentAddress) return;
    try {
      await contract.methods.verifyTranscript(studentAddress).send({ from: currentAccount });
      setStatusMessage("✅ Transcript verified on blockchain!");
    } catch (err) {
      console.error(err);
      setStatusMessage("Verification failed (maybe already verified or no transcript?).");
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Verifier Dashboard</h2>
      <div className="mb-4">
        <label className="block mb-1">Student Address:</label>
        <input 
          type="text" 
          value={studentAddress} 
          onChange={e => setStudentAddress(e.target.value)} 
          className="w-full p-2 border" 
          placeholder="0x... address"
        />
        <button 
          onClick={handleLookup} 
          className="mt-2 bg-blue-600 text-white px-3 py-1 rounded"
        >
          Lookup Transcript
        </button>
      </div>
      {transcriptHash && (
        <div className="mb-4 p-3 border">
          <p><strong>Transcript IPFS:</strong> {transcriptHash}</p>
          <a 
            href={`https://ipfs.io/ipfs/${transcriptHash}`} 
            target="_blank" rel="noopener noreferrer" 
            className="text-blue-600 underline"
          >
            View File
          </a>
        </div>
      )}
      {transcriptHash && (
        <button 
          onClick={handleVerify} 
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Verify Transcript
        </button>
      )}
      {statusMessage && <div className="mt-3 text-center">{statusMessage}</div>}
    </div>
  );
}