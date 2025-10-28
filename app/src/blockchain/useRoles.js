// app/src/blockchain/useRoles.js
import { useEffect, useState, useContext } from "react";
import { Web3Ctx } from "./Web3Provider.jsx";

export function useRoles() {
  const { web3, contract, account } = useContext(Web3Ctx);
  const [roles, setRoles] = useState({ isRegistrar: false, isTeacher: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!web3 || !contract || !account) return;
      setLoading(true);
      const REGISTRAR_ROLE = web3.utils.keccak256("REGISTRAR_ROLE");
      const TEACHER_ROLE = web3.utils.keccak256("TEACHER_ROLE");
      const isRegistrar = await contract.methods.hasRole(REGISTRAR_ROLE, account).call();
      const isTeacher   = await contract.methods.hasRole(TEACHER_ROLE, account).call();
      setRoles({ isRegistrar, isTeacher });
      setLoading(false);
    })();
  }, [web3, contract, account]);

  return { ...roles, loading };
}