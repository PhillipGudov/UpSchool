// app/src/components/NavBar.jsx
import React from "react";
import { Link } from "react-router-dom";

export default function NavBar() {
  return (
    <nav style={{display:"flex", gap:16, padding:16, borderBottom:"1px solid #eee"}}>
      <Link to="/">Home</Link>
      <Link to="/teacher">Teacher</Link>
      <Link to="/registrar">Registrar</Link>
      <Link to="/student">Student</Link>
      <Link to="/verify">Verifier</Link>
    </nav>
  );
}