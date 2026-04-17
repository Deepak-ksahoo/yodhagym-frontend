import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth, ROLES } from '../context/AuthContext';
import { toast } from 'react-toastify';

const ProtectedRoute = ({ allowedRoles }) => {
  const { user } = useAuth();
  const [isReady, setIsReady] = useState(false);

  const normalizedRole = typeof user?.role === 'string' ? user.role.trim().toLowerCase() : user?.role;
  const resolvedRole = normalizedRole === 'user' ? ROLES.MEMBER : normalizedRole;

  useEffect(() => {
    if (user && !allowedRoles.includes(resolvedRole)) {
      toast.error('Unauthorized access. Redirected to safe zone!', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "dark",
      });
    }
    setIsReady(true);
  }, [user, allowedRoles, resolvedRole]);

  if (!isReady) return null; // Avoid render flash

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(resolvedRole)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
