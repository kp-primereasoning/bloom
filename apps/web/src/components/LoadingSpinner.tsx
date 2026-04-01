/**
 * Loading spinner component for auth loading state.
 */

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-bloom-cream">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bloom-sage" />
        <p className="text-stone-400 text-sm font-light">Loading...</p>
      </div>
    </div>
  );
}
