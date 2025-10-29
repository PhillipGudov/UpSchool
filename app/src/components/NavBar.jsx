// app/src/components/Navbar.jsx
import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { Web3Context } from './Web3Provider';

export default function Navbar() {
  const { currentAccount, userRole } = useContext(Web3Context);
  return (
    <nav className="bg-blue-800 text-white p-4 flex justify-between">
      <div className="text-xl font-bold">PowerSchool DApp</div>
      <div className="space-x-4">
        <Link to="/" className="hover:underline">Home</Link>
        {userRole === "REGISTRAR" && <Link to="/registrar" className="hover:underline">Registrar Dashboard</Link>}
        {userRole === "TEACHER" && <Link to="/teacher" className="hover:underline">Teacher Dashboard</Link>}
        {userRole === "STUDENT" && <Link to="/student" className="hover:underline">Student Dashboard</Link>}
        {userRole === "VERIFIER" && <Link to="/verifier" className="hover:underline">Verifier Dashboard</Link>}
      </div>
      <div>
        {currentAccount ? (
          <span className="text-sm">Connected: {currentAccount.slice(0, 6)}...{currentAccount.slice(-4)}</span>
        ) : (
          <span className="text-sm text-red-400">Not Connected</span>
        )}
      </div>
    </nav>
  );
}
