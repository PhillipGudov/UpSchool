// app/src/components/RoleGuard.jsx
import React from "react";
export default function RoleGuard({ allowed, children }) {
  if (!allowed) return <p style={{color:"#b00"}}>You don’t have permission to view this page.</p>;
  return children;
}