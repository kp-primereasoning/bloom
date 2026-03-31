export function getCognitoSignupUrl(): string {
  const domain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN;
  const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI;
  const params = new URLSearchParams({
    client_id: clientId!,
    response_type: "code",
    scope: "openid email profile",
    redirect_uri: redirectUri!,
  });
  return `https://${domain}/signup?${params.toString()}`;
}
