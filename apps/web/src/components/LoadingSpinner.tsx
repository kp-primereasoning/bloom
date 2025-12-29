/**
 * Loading spinner component for auth loading state.
 */

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    </div>
  );
}
