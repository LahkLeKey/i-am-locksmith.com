import {notFound, redirect} from 'next/navigation';

import {ROUTE_PERMISSION_MAP} from './policy';
import {authorizePermission, getAuthorizationContext} from './server';

export async function requireAuthenticatedContext() {
  const context = await getAuthorizationContext();
  if (!context) {
    redirect('/sign-in');
  }

  return context;
}

export async function requireRoutePermission(
  route: keyof typeof ROUTE_PERMISSION_MAP
) {
  const permission = ROUTE_PERMISSION_MAP[route];
  const decision = await authorizePermission(permission);

  if (decision.state === 'unauthenticated') {
    redirect('/sign-in');
  }

  if (decision.state === 'forbidden') {
    notFound();
  }
}
