type PublicEnv = Record<string, string|undefined>;

type ClerkProviderConfig = {
  allowedRedirectOrigins: string[];
  proxyUrl?: string; signInUrl: string; signUpUrl: string;
  signInFallbackRedirectUrl: string;
  signUpFallbackRedirectUrl: string;
};

const REQUIRED_CLERK_ENV_KEYS = [
  'CLERK_SECRET_KEY',
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
] as const;

export const CLERK_PROXY_PATH = '/__clerk';
export const CLERK_SIGN_IN_PATH = '/sign-in';
export const CLERK_SIGN_UP_PATH = '/sign-up';
export const CLERK_POST_AUTH_PATH = '/dashboard';

function shouldUseClerkProxy(env: PublicEnv = process.env): boolean {
  const override = env.NEXT_PUBLIC_CLERK_USE_PROXY?.trim().toLowerCase();
  if (override === 'true') {
    return true;
  }

  if (override === 'false') {
    return false;
  }

  return env.VERCEL_ENV !== 'production';
}

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
  const useClerkProxy = shouldUseClerkProxy(env);

  return {
    allowedRedirectOrigins: getAllowedRedirectOrigins(env),
    ...(useClerkProxy ? {proxyUrl: CLERK_PROXY_PATH} : {}),
    signInUrl: CLERK_SIGN_IN_PATH,
    signUpUrl: CLERK_SIGN_UP_PATH,
    signInFallbackRedirectUrl: CLERK_POST_AUTH_PATH,
    signUpFallbackRedirectUrl: CLERK_POST_AUTH_PATH,
  };
}

export function validateClerkEnvironment(env: PublicEnv = process.env): void {
  const missingKeys = REQUIRED_CLERK_ENV_KEYS.filter((key) => {
    const value = env[key];
    return !value || value.trim().length === 0;
  });

  if (missingKeys.length > 0) {
    throw new Error(
        `Missing required Clerk environment variables: ${missingKeys.join(', ')}. Set them in both Vercel Production and Preview environments, then restart the app.`);
  }
}

export function getClerkMiddlewareOptions(env: PublicEnv = process.env) {
  const useClerkProxy = shouldUseClerkProxy(env);

  return {
    ...(useClerkProxy ? {proxyUrl: CLERK_PROXY_PATH} : {}),
    signInUrl: CLERK_SIGN_IN_PATH,
    signUpUrl: CLERK_SIGN_UP_PATH,
    ...(useClerkProxy ? {frontendApiProxy: {enabled: true}} : {}),
  };
}
