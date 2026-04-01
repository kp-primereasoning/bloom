import { RoleSwitcher } from './RoleSwitcher';
import { useAuth } from '@/providers/AuthProvider';

export function TopBar() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = 'https://blooms.now';
  };

  return (
    <header className="h-14 bg-white border-b border-stone-200/60 flex items-center justify-between px-6">
      <a href="/" className="flex items-center gap-2 group">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-bloom-sage transition-transform group-hover:rotate-12" aria-hidden="true">
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
          <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
        </svg>
        <span className="font-serif text-lg text-bloom-dark tracking-tight">Bloom</span>
      </a>
      <div className="flex items-center gap-4">
        <RoleSwitcher />
        {user && (
          <div className="flex items-center gap-3">
            <span className="text-[0.8125rem] text-stone-500">{user.email}</span>
            <button
              onClick={handleLogout}
              className="text-[0.8125rem] text-stone-400 hover:text-bloom-dark px-2 py-1 rounded-md hover:bg-stone-100 transition-colors"
            >
              Log out
            </button>
          </div>
        )}
        <div className="w-7 h-7 rounded-full bg-bloom-sage/15 flex items-center justify-center">
          <span className="text-xs text-bloom-sage font-medium">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </span>
        </div>
      </div>
    </header>
  );
}
