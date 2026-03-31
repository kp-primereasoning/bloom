/**
 * Cognito OAuth callback page.
 * Extracts the authorization code from the URL, exchanges it for tokens,
 * and routes the user based on their account state.
 */

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { exchangeAuthCode, setAuthToken } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';

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

export function CallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) {
      setError('Missing authorization code');
      return;
    }

    let cancelled = false;

    async function handleCallback(authCode: string) {
      try {
        const response = await exchangeAuthCode(authCode);
        if (cancelled) return;

        setAuthToken(response.access_token);
        setUser(response.user);

        const user = response.user;
        if (!user.property_id) {
          navigate('/onboarding/property', { replace: true });
        } else if (user.subscription_status === 'CREATED') {
          navigate('/onboarding/subscription', { replace: true });
        } else {
          navigate('/customer', { replace: true });
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Authentication failed');
      }
    }

    handleCallback(code);
    return () => { cancelled = true; };
  }, [searchParams, navigate, setUser]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center space-y-4">
          <div className="text-red-500 text-4xl">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900">Authentication failed</h2>
          <p className="text-gray-600">{error}</p>
          <a
            href={getCognitoSignupUrl()}
            className="inline-block w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Try again
          </a>
        </div>
      </div>
    );
  }

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
        <p className="text-gray-600">Signing you in...</p>
      </motion.div>
    </div>
  );
}
