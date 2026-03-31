/**
 * Registration page — redirects to Cognito Hosted UI.
 * The custom email/password form has been replaced with a Cognito redirect.
 */

import { useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

function getCognitoSignupUrl(): string {
  const domain = import.meta.env.VITE_COGNITO_DOMAIN;
  const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_COGNITO_REDIRECT_URI;
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    scope: 'openid email profile',
    redirect_uri: redirectUri,
  });
  return `https://${domain}/signup?${params.toString()}`;
}

export function RegisterPage() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;

    // If already authenticated, route based on state
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
      return;
    }

    // Not authenticated — redirect to Cognito signup
    window.location.href = getCognitoSignupUrl();
  }, [isAuthenticated, user, isLoading, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <motion.div
        className="text-center space-y-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="mx-auto rounded-full h-10 w-10 border-b-2 border-green-600"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        <p className="text-gray-600">Redirecting to sign up...</p>
      </motion.div>
    </div>
  );
}
