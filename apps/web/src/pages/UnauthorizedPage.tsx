/**
 * Unauthorized (403) page component.
 */

import { Link } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { getDefaultPath } from '@/config/sidebarConfig';

export function UnauthorizedPage() {
  const { user, isAuthenticated } = useAuth();

  const homeLink = isAuthenticated && user 
    ? getDefaultPath(user.role) 
    : '/login';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        <div className="text-6xl mb-4">🚫</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Access Denied
        </h1>
        <p className="text-gray-600 mb-8">
          You don't have permission to access this page.
        </p>
        <Link
          to={homeLink}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-bloom-dark hover:bg-stone-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bloom-sage"
        >
          {isAuthenticated ? 'Go to Dashboard' : 'Go to Login'}
        </Link>
      </div>
    </div>
  );
}
