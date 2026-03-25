/**
 * Animated layout wrapper for onboarding pages.
 * Provides consistent styling, progress header, and page transitions.
 */

import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { OnboardingProgress } from './OnboardingProgress';

interface OnboardingLayoutProps {
  children: ReactNode;
  currentStep: 1 | 2 | 3;
  title: string;
  subtitle?: string;
}

// Animation variants for page transitions
const pageVariants = {
  initial: { 
    opacity: 0, 
    y: 20,
    scale: 0.98
  },
  animate: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94] as const
    }
  },
  exit: { 
    opacity: 0, 
    y: -20,
    scale: 0.98,
    transition: {
      duration: 0.3
    }
  }
};

const cardVariants = {
  initial: { 
    opacity: 0, 
    y: 30,
    boxShadow: '0 0 0 rgba(0, 0, 0, 0)'
  },
  animate: { 
    opacity: 1, 
    y: 0,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    transition: {
      duration: 0.5,
      delay: 0.2,
      ease: [0.25, 0.46, 0.45, 0.94] as const
    }
  }
};

export function OnboardingLayout({
  children,
  currentStep,
  title,
  subtitle,
}: OnboardingLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Animated Logo */}
        <motion.div 
          className="text-center mb-6"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ 
            type: 'spring', 
            stiffness: 200, 
            damping: 15 
          }}
        >
          <motion.h1 
            className="text-3xl font-bold text-green-600"
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            🌸 Bloom
          </motion.h1>
        </motion.div>
        
        {/* Progress indicator */}
        <OnboardingProgress currentStep={currentStep} />
        
        {/* Animated Title */}
        <AnimatePresence mode="wait">
          <motion.div
            key={title}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <h2 className="text-center text-2xl font-bold text-gray-900">
              {title}
            </h2>
            {subtitle && (
              <motion.p 
                className="mt-2 text-center text-sm text-gray-600"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {subtitle}
              </motion.p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <motion.div 
          className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10"
          variants={cardVariants}
          initial="initial"
          animate="animate"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
