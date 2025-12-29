/**
 * Protected route component that enforces authentication and role-based access.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { UserRole } from '@bloom/shared';
import { getDefaultPath } from '@/config/sidebarConfig';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

/**
 * Protects routes based on authentication and role.
 * 
 * - Unauthenticated users are redirected to /login
 * - Users with wrong role are redirected to their role's landing page
 * - Authenticated users with correct role see the page
 */
export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking auth
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Redirect unauthenticated users to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role if allowedRoles is specified
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirect to user's role landing page
    return <Navigate to={getDefaultPath(user.role)} replace />;
  }

  return <>{children}</>;
}
