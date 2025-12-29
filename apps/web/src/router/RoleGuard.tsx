import { Navigate, useLocation } from 'react-router-dom';
import { getStoredRole } from '@/hooks/useRole';
import { isPathInNamespace, getDefaultPath } from '@/config/sidebarConfig';

interface RoleGuardProps {
  children: React.ReactNode;
}

/**
 * Route guard that redirects users to their role's default page
 * if they try to access a route outside their namespace
 */
export function RoleGuard({ children }: RoleGuardProps) {
  const location = useLocation();
  const currentRole = getStoredRole();
  const currentPath = location.pathname;

  // Check if the current path is within the user's role namespace
  if (!isPathInNamespace(currentPath, currentRole)) {
    // Redirect to the role's default landing page
    return <Navigate to={getDefaultPath(currentRole)} replace />;
  }

  return <>{children}</>;
}
