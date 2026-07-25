import {createCustomerServiceSite, updateCustomerServiceSite} from '@/lib/customers/repository';
import {authorizePermission, getAuthorizationContext} from '@/lib/rbac/server';
import {NextResponse} from 'next/server';

export async function POST(
    request: Request, {params}: {params: Promise<{customerId: string}>}) {
  const context = await getAuthorizationContext();
  if (!context)
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  if (!context.orgId)
    return NextResponse.json(
        {error: 'No active organization selected'}, {status: 400});
  const decision = await authorizePermission('customers.manage');
  if (decision.state !== 'authorized') {
    return NextResponse.json(
        {error: decision.state === 'forbidden' ? 'Forbidden' : 'Unauthorized'},
        {status: decision.state === 'forbidden' ? 403 : 401});
  }
  let body: {
    label?: string;
    address?: string;
    latitude?: number | null;
    longitude?: number | null
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({error: 'Invalid JSON payload'}, {status: 400});
  }
  const label = body.label?.trim();
  const address = body.address?.trim();
  const hasLatitude = body.latitude !== null && body.latitude !== undefined;
  const hasLongitude = body.longitude !== null && body.longitude !== undefined;
  if (!label || !address || hasLatitude !== hasLongitude) {
    return NextResponse.json(
        {error: 'label, address, and a complete coordinate pair are required'},
        {status: 400});
  }
  if (hasLatitude &&
      (!Number.isFinite(body.latitude) || !Number.isFinite(body.longitude) ||
       Math.abs(body.latitude!) > 90 || Math.abs(body.longitude!) > 180)) {
    return NextResponse.json({error: 'Invalid coordinates'}, {status: 400});
  }
  const {customerId} = await params;
  const site = await createCustomerServiceSite(context.orgId, customerId, {
    label,
    address,
    latitude: hasLatitude ? body.latitude! : null,
    longitude: hasLongitude ? body.longitude! : null,
  });
  if (!site)
    return NextResponse.json({error: 'Customer not found'}, {status: 404});
  return NextResponse.json({ok: true, site});
}

export async function PATCH(
    request: Request, {params}: {params: Promise<{customerId: string}>}) {
  const context = await getAuthorizationContext();
  if (!context)
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  if (!context.orgId)
    return NextResponse.json(
        {error: 'No active organization selected'}, {status: 400});
  const decision = await authorizePermission('customers.manage');
  if (decision.state !== 'authorized') {
    return NextResponse.json(
        {error: decision.state === 'forbidden' ? 'Forbidden' : 'Unauthorized'},
        {status: decision.state === 'forbidden' ? 403 : 401});
  }
  let body: {
    id?: string; label?: string; address?: string;
    latitude?: number | null; longitude?: number | null; isPrimary?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({error: 'Invalid JSON payload'}, {status: 400});
  }
  const label = body.label?.trim();
  const address = body.address?.trim();
  const hasLatitude = body.latitude !== null && body.latitude !== undefined;
  const hasLongitude = body.longitude !== null && body.longitude !== undefined;
  if (!body.id || !label || !address || hasLatitude !== hasLongitude) {
    return NextResponse.json(
        {error: 'id, label, address, and a complete coordinate pair are required'},
        {status: 400});
  }
  if (hasLatitude &&
      (!Number.isFinite(body.latitude) || !Number.isFinite(body.longitude) ||
       Math.abs(body.latitude!) > 90 || Math.abs(body.longitude!) > 180)) {
    return NextResponse.json({error: 'Invalid coordinates'}, {status: 400});
  }
  const {customerId} = await params;
  const site = await updateCustomerServiceSite(
      context.orgId, customerId, body.id, {
        label, address,
        latitude: hasLatitude ? body.latitude! : null,
        longitude: hasLongitude ? body.longitude! : null,
        isPrimary: body.isPrimary ?? false,
      });
  if (!site)
    return NextResponse.json({error: 'Service site not found'}, {status: 404});
  return NextResponse.json({ok: true, site});
}