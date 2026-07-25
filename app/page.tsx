import { redirect } from 'next/navigation';

import { getAuthorizationContext } from '@/lib/rbac/server';

export default async function Home() {
  const context = await getAuthorizationContext();

  redirect(context ? '/dashboard' : '/sign-in');
}
