/**
 * Registration page — redirects to Cognito Hosted UI.
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
    if (isAuthenticated && user) {
      if (user.role !== 'CUSTOMER') {
        navigate({ ADMIN: '/admin', PROPERTY_MANAGER: '/pm', FLORIST: '/florist' }[user.role] || '/');
      } else if (!user.property_id) {
        navigate('/onboarding/property');
      } else if (user.subscription_status === 'CREATED') {
        navigate('/onboarding/subscription');
      } else {
        navigate('/customer');
      }
      return;
    }
    window.location.href = getCognitoSignupUrl();
  }, [isAuthenticated, user, isLoading, navigate]);

  return (
    <div className="min-h-screen bg-bloom-cream flex flex-col items-center justify-center">
      <motion.div className="text-center space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <motion.div className="mx-auto rounded-full h-8 w-8 border-b-2 border-bloom-sage"
          animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
        <p className="text-stone-500 text-[0.9375rem] font-light">Redirecting to sign up...</p>
      </motion.div>
    </div>
  );
}
