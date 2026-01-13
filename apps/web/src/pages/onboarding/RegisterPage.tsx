/**
 * Registration page for customer onboarding.
 * Step 1: Create account with email and password.
 * Enhanced with Motion animations for a premium UX.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { OnboardingLayout } from '@/components/OnboardingLayout';
import { register, setAuthToken } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';

// Staggered animation for form fields
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }
  }
};

const buttonVariants = {
  idle: { scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 }
};

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, user, setUser } = useAuth();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Pre-fill email from query param
  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
    
    // Store property_id for later use if provided
    const propertyIdParam = searchParams.get('property_id');
    if (propertyIdParam) {
      sessionStorage.setItem('onboarding_property_id', propertyIdParam);
    }
  }, [searchParams]);
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role !== 'CUSTOMER') {
        const landingPages: Record<string, string> = {
          ADMIN: '/admin',
          PROPERTY_MANAGER: '/pm',
          FLORIST: '/florist',
        };
        navigate(landingPages[user.role] || '/');
      } else if (!user.property_id) {
        navigate('/onboarding/property');
      } else if (user.subscription_status === 'CREATED') {
        navigate('/onboarding/subscription');
      } else {
        navigate('/customer');
      }
    }
  }, [isAuthenticated, user, navigate]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await register({ email, password });
      setAuthToken(response.access_token);
      setUser(response.user);
      navigate('/onboarding/property');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <OnboardingLayout
      currentStep={1}
      title="Create your account"
      subtitle="Join Bloom to receive beautiful floral deliveries"
    >
      <motion.form 
        onSubmit={handleSubmit} 
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded overflow-hidden"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>
        
        <motion.div variants={itemVariants}>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email address
          </label>
          <motion.input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 transition-shadow"
            placeholder="you@example.com"
            whileFocus={{ boxShadow: '0 0 0 3px rgba(34, 197, 94, 0.2)' }}
          />
        </motion.div>
        
        <motion.div variants={itemVariants}>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <motion.input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 transition-shadow"
            placeholder="At least 6 characters"
            whileFocus={{ boxShadow: '0 0 0 3px rgba(34, 197, 94, 0.2)' }}
          />
        </motion.div>
        
        <motion.div variants={itemVariants}>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
            Confirm password
          </label>
          <motion.input
            id="confirmPassword"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 transition-shadow"
            placeholder="Confirm your password"
            whileFocus={{ boxShadow: '0 0 0 3px rgba(34, 197, 94, 0.2)' }}
          />
        </motion.div>
        
        <motion.div variants={itemVariants}>
          <motion.button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            variants={buttonVariants}
            initial="idle"
            whileHover={!isLoading ? "hover" : "idle"}
            whileTap={!isLoading ? "tap" : "idle"}
          >
            {isLoading ? (
              <motion.span
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                Creating account...
              </motion.span>
            ) : (
              'Create account'
            )}
          </motion.button>
        </motion.div>
        
        <motion.div 
          variants={itemVariants}
          className="text-center text-sm text-gray-600"
        >
          Already have an account?{' '}
          <motion.a 
            href="/login" 
            className="text-green-600 hover:text-green-500"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Sign in
          </motion.a>
        </motion.div>
      </motion.form>
    </OnboardingLayout>
  );
}
