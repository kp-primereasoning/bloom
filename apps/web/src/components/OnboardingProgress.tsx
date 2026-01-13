/**
 * Animated progress indicator for onboarding flow.
 * Shows current step with smooth transitions between states.
 */

import { motion } from 'motion/react';

interface OnboardingProgressProps {
  currentStep: 1 | 2 | 3;
}

const steps = [
  { number: 1, label: 'Register' },
  { number: 2, label: 'Select Property' },
  { number: 3, label: 'Activate' },
];

export function OnboardingProgress({ currentStep }: OnboardingProgressProps) {
  return (
    <div className="mb-8">
      <motion.div 
        className="text-center mb-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <span className="text-sm font-medium text-gray-600">
          Step {currentStep} of 3
        </span>
      </motion.div>
      <div className="flex items-center justify-center space-x-4">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center">
            <motion.div
              className={`
                flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                ${step.number < currentStep
                  ? 'bg-green-500 text-white'
                  : step.number === currentStep
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-500'
                }
              `}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: step.number === currentStep ? 1.1 : 1, 
                opacity: 1 
              }}
              transition={{ 
                type: 'spring', 
                stiffness: 300, 
                damping: 20,
                delay: index * 0.1 
              }}
              whileHover={{ scale: 1.15 }}
            >
              {step.number < currentStep ? (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500 }}
                >
                  ✓
                </motion.span>
              ) : (
                step.number
              )}
            </motion.div>
            <motion.span
              className={`
                ml-2 text-sm
                ${step.number === currentStep
                  ? 'font-medium text-gray-900'
                  : 'text-gray-500'
                }
              `}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 + 0.1 }}
            >
              {step.label}
            </motion.span>
            {index < steps.length - 1 && (
              <div className="relative w-12 h-0.5 mx-4 bg-gray-200 overflow-hidden rounded">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-green-500"
                  initial={{ width: 0 }}
                  animate={{ 
                    width: step.number < currentStep ? '100%' : '0%' 
                  }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
