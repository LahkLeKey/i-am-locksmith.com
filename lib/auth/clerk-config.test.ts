import {describe, expect, it} from 'vitest';

import {CLERK_POST_AUTH_PATH, CLERK_PROXY_PATH, CLERK_SIGN_IN_PATH, CLERK_SIGN_UP_PATH, getAllowedRedirectOrigins, getClerkMiddlewareOptions, getClerkProviderProps,} from './clerk-config';

describe('getAllowedRedirectOrigins', () => {
  it('includes default production and local origins', () => {
    const origins = getAllowedRedirectOrigins({});

    expect(origins).toContain('https://www.ali-d.com');
    expect(origins).toContain('https://ali-d.com');
    expect(origins).toContain('http://localhost:3000');
  });

  it('normalizes dynamic vercel origins', () => {
    const origins = getAllowedRedirectOrigins({
      VERCEL_URL: 'locksmith-dashboard-kyle-haleks-projects.vercel.app',
    });

    expect(origins).toContain(
        'https://locksmith-dashboard-kyle-haleks-projects.vercel.app');
  });

  it('accepts fully qualified app and site URLs', () => {
    const origins = getAllowedRedirectOrigins({
      NEXT_PUBLIC_APP_URL: 'https://app.ali-d.com/path',
      NEXT_PUBLIC_SITE_URL: 'https://preview.ali-d.com',
    });

    expect(origins).toContain('https://app.ali-d.com');
    expect(origins).toContain('https://preview.ali-d.com');
  });

  it('normalizes Vercel production URL and de-dupes defaults', () => {
    const origins = getAllowedRedirectOrigins({
      VERCEL_PROJECT_PRODUCTION_URL: 'www.ali-d.com',
      VERCEL_URL: 'www.ali-d.com',
    });

    expect(origins.filter((origin) => origin === 'https://www.ali-d.com')).toHaveLength(1);
  });
});

describe('Clerk config helpers', () => {
  it('builds provider props for same-origin auth flows', () => {
    const props = getClerkProviderProps({});

    expect(props.proxyUrl).toBe(CLERK_PROXY_PATH);
    expect(props.signInUrl).toBe(CLERK_SIGN_IN_PATH);
    expect(props.signUpUrl).toBe(CLERK_SIGN_UP_PATH);
    expect(props.signInFallbackRedirectUrl).toBe(CLERK_POST_AUTH_PATH);
    expect(props.signUpFallbackRedirectUrl).toBe(CLERK_POST_AUTH_PATH);
  });

  it('builds middleware options for frontend api proxying', () => {
    const options = getClerkMiddlewareOptions();

    expect(options.proxyUrl).toBe(CLERK_PROXY_PATH);
    expect(options.signInUrl).toBe(CLERK_SIGN_IN_PATH);
    expect(options.signUpUrl).toBe(CLERK_SIGN_UP_PATH);
    expect(options.frontendApiProxy.enabled).toBe(true);
  });
});
