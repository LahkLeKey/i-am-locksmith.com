type PublicEnv = Record<string, string|undefined>;

type ClerkProviderConfig = {
  allowedRedirectOrigins: string[]; proxyUrl: string; signInUrl: string;
  signUpUrl: string;
  signInFallbackRedirectUrl: string;
  signUpFallbackRedirectUrl: string;
};

export const CLERK_PROXY_PATH = '/__clerk';
export const CLERK_SIGN_IN_PATH = '/sign-in';
export const CLERK_SIGN_UP_PATH = '/sign-up';
export const CLERK_POST_AUTH_PATH = '/dashboard';

function toOrigin(candidate: string|undefined): string|null {
  if (!candidate) {
    return null;
  }

  try {
    if (candidate.startsWith('http://') || candidate.startsWith('https://')) {
      return new URL(candidate).origin;
    }

    return new URL(`https://${candidate}`).origin;
  } catch {
    return null;
  }
}

export function getAllowedRedirectOrigins(env: PublicEnv = process.env):
    string[] {
  const defaults = [
    'https://www.i-am-locksmith.com', 'https://i-am-locksmith.com',
    'http://localhost:3000'
  ];
  const dynamic = [
    env.NEXT_PUBLIC_APP_URL,
    env.NEXT_PUBLIC_SITE_URL,
    env.VERCEL_PROJECT_PRODUCTION_URL,
    env.VERCEL_URL,
  ].map(toOrigin).filter((value): value is string => Boolean(value));

  return [...new Set([...defaults, ...dynamic])];
}

export function getClerkProviderProps(env: PublicEnv = process.env):
    ClerkProviderConfig {
  return {
    allowedRedirectOrigins: getAllowedRedirectOrigins(env),
    proxyUrl: CLERK_PROXY_PATH,
    signInUrl: CLERK_SIGN_IN_PATH,
    signUpUrl: CLERK_SIGN_UP_PATH,
    signInFallbackRedirectUrl: CLERK_POST_AUTH_PATH,
    signUpFallbackRedirectUrl: CLERK_POST_AUTH_PATH,
  };
}

export function getClerkMiddlewareOptions() {
  return {
    proxyUrl: CLERK_PROXY_PATH,
    signInUrl: CLERK_SIGN_IN_PATH,
    signUpUrl: CLERK_SIGN_UP_PATH,
    frontendApiProxy: {
      enabled: true,
    },
  };
}
