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

  useEffect(() => {
    if (isAuthenticated && user && window.location.pathname === '/') {
      navigate(getDefaultPath(user.role));
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = 'https://blooms.now';
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated || !user) return null;

  const config = getRoleConfig(user.role);

  return (
    <div className="min-h-screen bg-bloom-cream">
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
