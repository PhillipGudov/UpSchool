// app/src/components/RoleGuard.jsx
import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { Web3Context } from './Web3Provider';

export default function RoleGuard({ requiredRole, children }) {
  const { userRole } = useContext(Web3Context);

  if (!userRole) {
    // If role not determined yet, you might return a loading spinner or null
    return <div>Loading...</div>;
  }
  // If the user's role doesn't match the required role, redirect to home or an unauthorized page
  if (userRole !== requiredRole) {
    return <Navigate to="/" replace />;
  }
  // Role matches, render the protected component
  return children;
}
