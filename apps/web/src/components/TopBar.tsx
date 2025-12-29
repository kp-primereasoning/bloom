import { useNavigate } from 'react-router-dom';
import { RoleSwitcher } from './RoleSwitcher';
import { useAuth } from '@/providers/AuthProvider';

export function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <span className="text-xl font-semibold text-indigo-600">🌸 Bloom</span>
      </div>
      <div className="flex items-center gap-4">
        {/* Dev role switcher - only in development */}
        <RoleSwitcher />
        
        {/* User info */}
        {user && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{user.email}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
            >
              Logout
            </button>
          </div>
        )}
        
        {/* User avatar */}
        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
          <span className="text-sm text-indigo-600 font-medium">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </span>
        </div>
      </div>
    </header>
  );
}
