// app/src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Web3Provider from './components/Web3Provider';
import Navbar from './components/Navbar';
import RoleGuard from './components/RoleGuard';

import Home from './pages/Home';
import RegistrarDashboard from './pages/RegistrarDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import VerifierDashboard from './pages/VerifierDashboard';

function App() {
  return (
    <BrowserRouter>
      <Web3Provider>
        <Navbar />
        <div className="p-6">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route 
              path="/registrar" 
              element={
                <RoleGuard requiredRole="REGISTRAR">
                  <RegistrarDashboard />
                </RoleGuard>
              } 
            />
            <Route 
              path="/teacher" 
              element={
                <RoleGuard requiredRole="TEACHER">
                  <TeacherDashboard />
                </RoleGuard>
              } 
            />
            <Route 
              path="/student" 
              element={
                <RoleGuard requiredRole="STUDENT">
                  <StudentDashboard />
                </RoleGuard>
              } 
            />
            <Route 
              path="/verifier" 
              element={
                <RoleGuard requiredRole="VERIFIER">
                  <VerifierDashboard />
                </RoleGuard>
              } 
            />
          </Routes>
        </div>
      </Web3Provider>
    </BrowserRouter>
  );
}

export default App;