# Client Demo Auth Runbook

Version: 2026-07-20

This runbook covers the Clerk environment setup and the smoke checks we expect before every client demo.

## Required Vercel env vars

Set these in both the Production and Preview environments:

- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

If either key is missing, the app now fails fast at startup with a clear error.

To verify the project envs before a demo, check the Vercel project settings or run the Vercel env listing command for the active project and confirm both variables exist in Production and Preview.

## Clerk sign-in and redirect expectations

The app uses these fixed paths:

- Sign-in route: `/sign-in`
- Sign-up route: `/sign-up`
- Post-auth redirect: `/dashboard`

Configure Clerk with these explicit callbacks and URLs for the demo domain:

- Sign-in URL: `/sign-in`
- Sign-up URL: `/sign-up`
- Force sign-in redirect: `/dashboard`
- Force sign-up redirect: `/dashboard`

Clerk should allow redirect origins for:

- `https://www.i-am-locksmith.com`
- `https://i-am-locksmith.com`
- the active Vercel preview domain
- `http://localhost:3000` for local development

For Vercel, make sure both the preview deployment URL and the production domain are approved in Clerk so the auth flow works in demos and on the live site.

## Smoke checklist

Run these checks before every demo:

1. Signed-out user visits `/dashboard` and is redirected to `/sign-in`.
2. Signed-out user visits a protected app route and is redirected or shown the deny UX.
3. Signed-in authorized user can reach `/dashboard` and the role-appropriate nav items.
4. Signed-in unauthorized user cannot access a disallowed route or API action.
5. Sign-in and sign-up flows land on `/dashboard` after completion.
6. The app starts cleanly in both preview and production with the required Clerk env vars present.

## Demo prep order

1. Confirm the required Clerk env vars exist in Vercel.
2. Confirm the preview and production origins are approved in Clerk.
3. Open the app once and verify the startup check passes.
4. Run the smoke checklist above against the target environment.