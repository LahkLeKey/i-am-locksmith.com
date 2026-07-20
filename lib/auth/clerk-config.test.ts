import {describe, expect, it} from 'vitest';

import {CLERK_POST_AUTH_PATH, CLERK_PROXY_PATH, CLERK_SIGN_IN_PATH, CLERK_SIGN_UP_PATH, getAllowedRedirectOrigins, getClerkMiddlewareOptions, getClerkProviderProps, validateClerkEnvironment,} from './clerk-config';

describe('getAllowedRedirectOrigins', () => {
  it('includes default production and local origins', () => {
    const origins = getAllowedRedirectOrigins({});

    expect(origins).toContain('https://www.i-am-locksmith.com');
    expect(origins).toContain('https://i-am-locksmith.com');
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
      NEXT_PUBLIC_APP_URL: 'https://app.i-am-locksmith.com/path',
      NEXT_PUBLIC_SITE_URL: 'https://preview.i-am-locksmith.com',
    });

    expect(origins).toContain('https://app.i-am-locksmith.com');
    expect(origins).toContain('https://preview.i-am-locksmith.com');
  });

  it('normalizes Vercel production URL and de-dupes defaults', () => {
    const origins = getAllowedRedirectOrigins({
      VERCEL_PROJECT_PRODUCTION_URL: 'www.i-am-locksmith.com',
      VERCEL_URL: 'www.i-am-locksmith.com',
    });

    expect(
        origins.filter((origin) => origin === 'https://www.i-am-locksmith.com'))
        .toHaveLength(1);
  });
});

describe('Clerk config helpers', () => {
  it('fails fast when required env vars are missing', () => {
    expect(() => validateClerkEnvironment({}))
        .toThrow(
            'Missing required Clerk environment variables: CLERK_SECRET_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY. Set them in both Vercel Production and Preview environments, then restart the app.');
  });

  it('accepts populated auth env vars', () => {
    expect(() => validateClerkEnvironment({
             CLERK_SECRET_KEY: 'sk_test_123',
             NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_123',
           }))
        .not.toThrow();
  });

  it('builds provider props for same-origin auth flows', () => {
    const props = getClerkProviderProps({});

    expect(props.proxyUrl).toBe(CLERK_PROXY_PATH);
    expect(props.signInUrl).toBe(CLERK_SIGN_IN_PATH);
    expect(props.signUpUrl).toBe(CLERK_SIGN_UP_PATH);
    expect(props.signInFallbackRedirectUrl).toBe(CLERK_POST_AUTH_PATH);
    expect(props.signUpFallbackRedirectUrl).toBe(CLERK_POST_AUTH_PATH);
  });

  it('builds middleware options for frontend api proxying', () => {
    const options = getClerkMiddlewareOptions({});

    expect(options.proxyUrl).toBe(CLERK_PROXY_PATH);
    expect(options.signInUrl).toBe(CLERK_SIGN_IN_PATH);
    expect(options.signUpUrl).toBe(CLERK_SIGN_UP_PATH);
    expect(options.frontendApiProxy.enabled).toBe(true);
  });

  it('disables middleware frontend api proxy in production by default', () => {
    const options = getClerkMiddlewareOptions({VERCEL_ENV: 'production'});

    expect(options.proxyUrl).toBeUndefined();
    expect(options.signInUrl).toBe(CLERK_SIGN_IN_PATH);
    expect(options.signUpUrl).toBe(CLERK_SIGN_UP_PATH);
    expect(options.frontendApiProxy).toBeUndefined();
  });

  it('disables provider proxy in production by default', () => {
    const props = getClerkProviderProps({VERCEL_ENV: 'production'});

    expect(props.proxyUrl).toBeUndefined();
    expect(props.signInUrl).toBe(CLERK_SIGN_IN_PATH);
    expect(props.signUpUrl).toBe(CLERK_SIGN_UP_PATH);
  });

  it('supports forcing provider proxy usage in production', () => {
    const props = getClerkProviderProps({
      VERCEL_ENV: 'production',
      NEXT_PUBLIC_CLERK_USE_PROXY: 'true',
    });

    expect(props.proxyUrl).toBe(CLERK_PROXY_PATH);
  });
});
