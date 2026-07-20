import {ProtectedShell} from '@/app/components/protected-shell';
import {requireAuthenticatedContext} from '@/lib/rbac/guard';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await requireAuthenticatedContext();

  return <ProtectedShell context={context}>{children}</ProtectedShell>;
}
