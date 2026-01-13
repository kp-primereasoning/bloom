/**
 * StepCard component for displaying onboarding step status.
 * 
 * Renders a clickable card with step number, title, description,
 * and completion status indicator.
 */

export interface OnboardingStep {
  id: 'link-store' | 'link-products' | 'turn-on-deliveries';
  number: number;
  title: string;
  description: string;
  isComplete: boolean;
}

interface StepCardProps {
  step: OnboardingStep;
  onClick: () => void;
  disabled?: boolean;
}

/**
 * StepCard displays an onboarding step with completion status.
 * 
 * - Shows step number, title, and description
 * - Displays checkmark when complete, empty circle when incomplete
 * - Applies hover state for clickable indication
 * - Can be disabled to prevent interaction
 */
export function StepCard({ step, onClick, disabled = false }: StepCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full text-left p-4 rounded-lg border transition-all
        ${step.isComplete 
          ? 'bg-green-50 border-green-200 hover:bg-green-100' 
          : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      data-testid={`step-card-${step.id}`}
    >
      <div className="flex items-start gap-3">
        {/* Status indicator */}
        <div className="flex-shrink-0 mt-0.5">
          {step.isComplete ? (
            <div 
              className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center"
              data-testid="step-complete-indicator"
            >
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          ) : (
            <div 
              className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center"
              data-testid="step-incomplete-indicator"
            >
              <span className="text-xs font-medium text-gray-500">{step.number}</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 
            className={`text-sm font-medium ${step.isComplete ? 'text-green-800' : 'text-gray-900'}`}
            data-testid="step-title"
          >
            {step.title}
          </h3>
          <p 
            className={`text-sm mt-0.5 ${step.isComplete ? 'text-green-600' : 'text-gray-500'}`}
            data-testid="step-description"
          >
            {step.description}
          </p>
        </div>
      </div>
    </button>
  );
}
