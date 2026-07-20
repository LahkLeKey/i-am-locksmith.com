import {ROUTE_PERMISSION_MAP} from '@/lib/rbac/policy';
import {authorizePermission} from '@/lib/rbac/server';
import {NextResponse} from 'next/server';

export async function GET() {
  const decision =
      await authorizePermission(ROUTE_PERMISSION_MAP['GET /api/protected']);

  if (decision.state === 'unauthenticated') {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  if (decision.state === 'forbidden') {
    return NextResponse.json({error: 'Forbidden'}, {status: 403});
  }

  return NextResponse.json({
    message: 'This is a protected route with RBAC',
    timestamp: new Date().toISOString(),
  });
}

export async function POST() {
  const decision =
      await authorizePermission(ROUTE_PERMISSION_MAP['POST /api/protected']);

  if (decision.state === 'unauthenticated') {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  if (decision.state === 'forbidden') {
    return NextResponse.json({error: 'Forbidden'}, {status: 403});
  }

  return NextResponse.json({
    message: 'Protected POST endpoint accessed with RBAC',
    timestamp: new Date().toISOString(),
  });
}
