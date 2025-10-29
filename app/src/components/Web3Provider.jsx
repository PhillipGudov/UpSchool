// app/src/components/Web3Provider.jsx
import React, { createContext, useState, useEffect } from 'react';
import Web3 from 'web3';
import TranscriptAttendanceABI from '../abi/TranscriptAttendance.json';

export const Web3Context = createContext();

export default function Web3Provider({ children }) {
  const [web3, setWeb3] = useState(null);
  const [contract, setContract] = useState(null);
  const [currentAccount, setCurrentAccount] = useState(null);
  const [userRole, setUserRole] = useState(null);

  // Role identifiers (computed with web3.utils.keccak256 to match contract's constants)
  const ROLE = {
    REGISTRAR: Web3.utils.keccak256("REGISTRAR_ROLE"),
    TEACHER:   Web3.utils.keccak256("TEACHER_ROLE"),
    STUDENT:   Web3.utils.keccak256("STUDENT_ROLE"),
    VERIFIER:  Web3.utils.keccak256("VERIFIER_ROLE")
  };

  // Initialize web3 and contract on first load
  useEffect(() => {
    async function initBlockchain() {
      if (window.ethereum) {
        try {
          // Request account access if needed
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          const _web3 = new Web3(window.ethereum);
          setWeb3(_web3);
          // Get the current accounts and set the first as currentAccount
          const accounts = await _web3.eth.getAccounts();
          if (accounts.length > 0) {
            setCurrentAccount(accounts[0]);
          }

          // Get network ID and deployed contract address from ABI (assuming local Ganache)
          const networkId = await _web3.eth.net.getId();
          const deployedNetwork = TranscriptAttendanceABI.networks[networkId];
          const contractAddress = deployedNetwork && deployedNetwork.address;
          const _contract = new _web3.eth.Contract(TranscriptAttendanceABI.abi, contractAddress);
          setContract(_contract);
        } catch (error) {
          console.error("User denied account access or error in connecting to MetaMask", error);
        }
      } else {
        console.error("MetaMask not found. Please install or enable MetaMask.");
      }
    }
    initBlockchain();
  }, []);

  // Once contract and account are set, determine the user's role
  useEffect(() => {
    async function fetchUserRole() {
      if (!contract || !currentAccount) return;
      let role = null;
      try {
        const isRegistrar = await contract.methods.hasRole(ROLE.REGISTRAR, currentAccount).call();
        const isTeacher   = await contract.methods.hasRole(ROLE.TEACHER, currentAccount).call();
        const isStudent   = await contract.methods.hasRole(ROLE.STUDENT, currentAccount).call();
        const isVerifier  = await contract.methods.hasRole(ROLE.VERIFIER, currentAccount).call();
        if (isRegistrar) role = "REGISTRAR";
        else if (isTeacher) role = "TEACHER";
        else if (isStudent) role = "STUDENT";
        else if (isVerifier) role = "VERIFIER";
      } catch (err) {
        console.error("Error fetching user role:", err);
      }
      setUserRole(role);
    }
    fetchUserRole();
  }, [contract, currentAccount]);

  // Handle account or network changes (to update state accordingly)
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', accounts => {
        if (accounts.length > 0) {
          setCurrentAccount(accounts[0]);
        } else {
          setCurrentAccount(null);
          setUserRole(null);
        }
      });
      window.ethereum.on('chainChanged', chainId => {
        // Reload the page to avoid network mismatch issues
        window.location.reload();
      });
    }
  }, []);

  return (
    <Web3Context.Provider value={{ web3, contract, currentAccount, userRole, ROLE }}>
      {children}
    </Web3Context.Provider>
  );
}