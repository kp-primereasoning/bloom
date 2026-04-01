/**
 * Cognito OAuth callback page.
 * Exchanges the authorization code for tokens and routes the user.
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
    if (!code) { setError('Missing authorization code'); return; }

    let cancelled = false;

    async function handleCallback(authCode: string) {
      try {
        const response = await exchangeAuthCode(authCode);
        if (cancelled) return;
        setAuthToken(response.access_token);
        setUser(response.user);
        const user = response.user;
        if (!user.property_id) navigate('/onboarding/property', { replace: true });
        else if (user.subscription_status === 'CREATED') navigate('/onboarding/subscription', { replace: true });
        else navigate('/customer', { replace: true });
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
      <div className="min-h-screen bg-bloom-cream flex flex-col items-center justify-center px-4">
        <motion.div className="bg-white p-10 rounded-xl border border-stone-200/60 max-w-md w-full text-center space-y-5"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="font-serif text-3xl">⚠️</p>
          <h2 className="font-serif text-xl text-bloom-dark">Authentication failed</h2>
          <p className="text-stone-500 text-[0.9375rem] font-light">{error}</p>
          <a href={getCognitoSignupUrl()}
            className="inline-block w-full py-3 bg-bloom-dark hover:bg-stone-900 text-white rounded-lg text-sm font-medium tracking-wide transition-colors">
            Try again
          </a>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bloom-cream flex flex-col items-center justify-center">
      <motion.div className="text-center space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <motion.div className="mx-auto rounded-full h-8 w-8 border-b-2 border-bloom-sage"
          animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
        <p className="text-stone-500 text-[0.9375rem] font-light">Signing you in...</p>
      </motion.div>
    </div>
  );
}
