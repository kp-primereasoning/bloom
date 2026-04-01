/**
 * Layout wrapper for onboarding pages.
 * Matches the landing page's warm, premium aesthetic.
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

export function OnboardingLayout({
  children,
  currentStep,
  title,
  subtitle,
}: OnboardingLayoutProps) {
  return (
    <div className="min-h-screen bg-bloom-cream flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        {/* Logo */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <a href="https://blooms.now" className="inline-flex items-center gap-2 group">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-bloom-sage transition-transform group-hover:rotate-12" aria-hidden="true">
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
              <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
            </svg>
            <span className="font-serif text-xl text-bloom-dark tracking-tight">Bloom</span>
          </a>
        </motion.div>

        {/* Progress */}
        <OnboardingProgress currentStep={currentStep} />

        {/* Title */}
        <AnimatePresence mode="wait">
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="mt-6"
          >
            <h2 className="text-center font-serif text-2xl md:text-3xl text-bloom-dark font-light tracking-tight">
              {title}
            </h2>
            {subtitle && (
              <motion.p
                className="mt-2 text-center text-[0.9375rem] text-stone-500 font-light"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
              >
                {subtitle}
              </motion.p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <motion.div
          className="bg-white py-8 px-6 sm:px-10 rounded-xl border border-stone-200/60"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
