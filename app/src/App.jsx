// app/src/App.jsx
import React from "react";
import { BrowserRouter } from "react-router-dom";
import Web3Provider from "./blockchain/Web3Provider.jsx";
import NavBar from "./components/NavBar.jsx";
import AppRoutes from "./routes.jsx";

export default function App() {
  return (
    <Web3Provider>
      <BrowserRouter>
        <NavBar />
        <div style={{ maxWidth: 900, margin: "24px auto" }}>
          <AppRoutes />
        </div>
      </BrowserRouter>
    </Web3Provider>
  );
}