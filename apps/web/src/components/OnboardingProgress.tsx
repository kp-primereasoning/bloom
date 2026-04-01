/**
 * Minimal progress indicator for onboarding flow.
 * Three dots with connecting lines, matching the landing page aesthetic.
 */

import { motion } from 'motion/react';

interface OnboardingProgressProps {
  currentStep: 1 | 2 | 3;
}

const steps = [
  { number: 1, label: 'Account' },
  { number: 2, label: 'Building' },
  { number: 3, label: 'Activate' },
];

export function OnboardingProgress({ currentStep }: OnboardingProgressProps) {
  return (
    <div className="flex items-center justify-center gap-3">
      {steps.map((step, index) => (
        <div key={step.number} className="flex items-center gap-3">
          <div className="flex flex-col items-center gap-1.5">
            <motion.div
              className={`
                w-2.5 h-2.5 rounded-full transition-colors duration-300
                ${step.number <= currentStep
                  ? 'bg-bloom-sage'
                  : 'bg-stone-200'
                }
              `}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.1, type: 'spring', stiffness: 400 }}
            />
            <span className={`
              text-[0.6875rem] tracking-wide uppercase
              ${step.number === currentStep
                ? 'text-bloom-dark font-medium'
                : 'text-stone-400'
              }
            `}>
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className="w-12 h-px bg-stone-200 -mt-5 overflow-hidden">
              <motion.div
                className="h-full bg-bloom-sage"
                initial={{ width: 0 }}
                animate={{ width: step.number < currentStep ? '100%' : '0%' }}
                transition={{ duration: 0.4 }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
