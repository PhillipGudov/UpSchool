// app/src/pages/Home.jsx
import React, { useContext } from "react";
import { Web3Context } from "../components/Web3Provider";

export default function Home() {
  const { currentAccount, userRole } = useContext(Web3Context);

  return (
    <div className="max-w-2xl mx-auto text-center">
      <h1 className="text-3xl font-bold mb-2">Welcome to PowerSchool DApp</h1>
      <p className="text-gray-600 mb-6">
        Use the navigation bar to access your role dashboard.
      </p>

      <div className="p-4 border rounded bg-white/50">
        {currentAccount ? (
          <>
            <p className="mb-1">
              <span className="font-semibold">Connected wallet:</span>{" "}
              <span className="font-mono">
                {currentAccount.slice(0, 6)}...{currentAccount.slice(-4)}
              </span>
            </p>
            <p>
              <span className="font-semibold">Detected role:</span>{" "}
              {userRole ? userRole : "Detecting…"}
            </p>
          </>
        ) : (
          <p>
            Connect MetaMask to get started. If prompted, approve access to your
            wallet.
          </p>
        )}
      </div>

      <div className="mt-6 text-sm text-gray-500">
        Tip: switch accounts in MetaMask to see different dashboards.
      </div>
    </div>
  );
}