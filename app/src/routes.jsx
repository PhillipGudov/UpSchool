// app/src/routes.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./Home.jsx";
import TeacherDashboard from "./pages/TeacherDashboard.jsx";
import RegistrarDashboard from "./pages/RegistrarDashboard.jsx";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/teacher" element={<TeacherDashboard />} />
      <Route path="/registrar" element={<RegistrarDashboard />} />
      {/* Student & Verifier will come next */}
    </Routes>
  );
}