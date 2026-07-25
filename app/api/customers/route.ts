import {createCustomerWithSite, listCustomers, updateCustomer} from '@/lib/customers/repository';
import {authorizePermission, getAuthorizationContext} from '@/lib/rbac/server';
import {NextResponse} from 'next/server';

async function authorize(permission: 'customers.read'|'customers.manage') {
  const context = await getAuthorizationContext();
  if (!context)
    return {error: NextResponse.json({error: 'Unauthorized'}, {status: 401})};
  if (!context.orgId)
    return {
      error: NextResponse.json(
          {error: 'No active organization selected'}, {status: 400})
    };
  const decision = await authorizePermission(permission);
  if (decision.state === 'unauthenticated')
    return {error: NextResponse.json({error: 'Unauthorized'}, {status: 401})};
  if (decision.state === 'forbidden')
    return {error: NextResponse.json({error: 'Forbidden'}, {status: 403})};
  return {orgId: context.orgId};
}

function validCoordinates(latitude: unknown, longitude: unknown) {
  return typeof latitude === 'number' && Number.isFinite(latitude) &&
      latitude >= -90 && latitude <= 90 && typeof longitude === 'number' &&
      Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
}

export async function GET() {
  const auth = await authorize('customers.read');
  if ('error' in auth) return auth.error;
  return NextResponse.json(
      {ok: true, customers: await listCustomers(auth.orgId)});
}

export async function POST(request: Request) {
  const auth = await authorize('customers.manage');
  if ('error' in auth) return auth.error;

  let body: {
    displayName?: string;
    email?: string | null;
    phone?: string | null;
    notes?: string | null;
    site?: {
      label?: string;
      address?: string;
      latitude?: number | null;
      longitude?: number | null
    };
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({error: 'Invalid JSON payload'}, {status: 400});
  }

  const displayName = body.displayName?.trim();
  const siteLabel = body.site?.label?.trim();
  const address = body.site?.address?.trim();
  if (!displayName || !siteLabel || !address) {
    return NextResponse.json(
        {error: 'displayName and service site are required'}, {status: 400});
  }
  const latitude = body.site?.latitude;
  const longitude = body.site?.longitude;
  const hasLatitude = latitude !== undefined && latitude !== null;
  const hasLongitude = longitude !== undefined && longitude !== null;
  if (hasLatitude !== hasLongitude ||
      (hasLatitude && !validCoordinates(latitude, longitude))) {
    return NextResponse.json(
        {error: 'latitude and longitude must be valid coordinates'},
        {status: 400});
  }

  const customer = await createCustomerWithSite(auth.orgId, {
    displayName,
    email: body.email?.trim() || null,
    phone: body.phone?.trim() || null,
    notes: body.notes?.trim() || null,
    site: {
      label: siteLabel,
      address,
      latitude: hasLatitude ? latitude! : null,
      longitude: hasLongitude ? longitude! : null,
    },
  });
  return NextResponse.json({
    ok: true,
    message: `Created customer ${customer.displayName}`,
    customer
  });
}

export async function PATCH(request: Request) {
  const auth = await authorize('customers.manage');
  if ('error' in auth) return auth.error;
  let body: {
    id?: string; displayName?: string; email?: string | null;
    phone?: string | null; notes?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({error: 'Invalid JSON payload'}, {status: 400});
  }
  const displayName = body.displayName?.trim();
  if (!body.id || !displayName) {
    return NextResponse.json(
        {error: 'id and displayName are required'}, {status: 400});
  }
  const customer = await updateCustomer(auth.orgId, body.id, {
    displayName,
    email: body.email?.trim() || null,
    phone: body.phone?.trim() || null,
    notes: body.notes?.trim() || null,
  });
  if (!customer) {
    return NextResponse.json({error: 'Customer not found'}, {status: 404});
  }
  return NextResponse.json({
    ok: true, message: `Updated customer ${customer.displayName}`, customer,
  });
}