import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { getRoleConfig, getDefaultPath } from '@/config/sidebarConfig';
import { useAuth } from '@/providers/AuthProvider';
import { LoadingSpinner } from './LoadingSpinner';

export function DashboardLayout() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  // Show loading while checking auth
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    navigate('/login', { replace: true });
    return null;
  }

  const config = getRoleConfig(user.role);

  // Redirect to default path on initial load if at root
  useEffect(() => {
    if (window.location.pathname === '/') {
      navigate(getDefaultPath(user.role));
    }
  }, [user.role, navigate]);

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar />
      <div className="flex">
        <Sidebar navItems={config.navItems} />
        <main className="flex-1 p-6">
          <div className="max-w-5xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
