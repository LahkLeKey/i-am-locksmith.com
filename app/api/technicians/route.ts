import {authorizePermission, getAuthorizationContext} from '@/lib/rbac/server';
import {createTechnician, listTechnicians, type TechnicianAvailability, updateTechnician,} from '@/lib/technicians/repository';
import {NextResponse} from 'next/server';

type CreateTechnicianRequest = {
  fullName?: string;
  hourlyRate?: number;
  lockpickingSkills?: string[];
  availabilityStatus?: TechnicianAvailability;
  availabilityNote?: string | null;
  isActive?: boolean;
};

type UpdateTechnicianRequest = {
  id?: string;
  fullName?: string;
  hourlyRate?: number;
  lockpickingSkills?: string[];
  availabilityStatus?: TechnicianAvailability;
  availabilityNote?: string | null;
  isActive?: boolean;
};

const ALLOWED_AVAILABILITY: TechnicianAvailability[] =
    ['available', 'busy', 'off_shift'];

function isTechnicianAvailability(value: unknown):
    value is TechnicianAvailability {
  return typeof value === 'string' &&
      ALLOWED_AVAILABILITY.includes(value as TechnicianAvailability);
}

function normalizeSkills(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter((entry) => entry.length > 0);
}

async function authorize(permission: 'technicians.read'|'technicians.manage') {
  const context = await getAuthorizationContext();

  if (!context) {
    return {error: NextResponse.json({error: 'Unauthorized'}, {status: 401})};
  }

  if (!context.orgId) {
    return {
      error: NextResponse.json(
          {error: 'No active organization selected'}, {status: 400}),
    };
  }

  const decision = await authorizePermission(permission);

  if (decision.state === 'unauthenticated') {
    return {error: NextResponse.json({error: 'Unauthorized'}, {status: 401})};
  }

  if (decision.state === 'forbidden') {
    return {error: NextResponse.json({error: 'Forbidden'}, {status: 403})};
  }

  return {orgId: context.orgId};
}

export async function GET() {
  const authResult = await authorize('technicians.read');

  if ('error' in authResult) {
    return authResult.error;
  }

  const technicians = await listTechnicians(authResult.orgId);
  return NextResponse.json({ok: true, technicians});
}

export async function POST(request: Request) {
  const authResult = await authorize('technicians.manage');

  if ('error' in authResult) {
    return authResult.error;
  }

  let body: CreateTechnicianRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({error: 'Invalid JSON payload'}, {status: 400});
  }

  const fullName = body.fullName?.trim();
  const hourlyRate = body.hourlyRate;
  const lockpickingSkills = normalizeSkills(body.lockpickingSkills);

  if (!fullName) {
    return NextResponse.json({error: 'fullName is required'}, {status: 400});
  }

  if (!Number.isFinite(hourlyRate) || hourlyRate! < 0) {
    return NextResponse.json(
        {error: 'hourlyRate must be a non-negative number'}, {status: 400});
  }

  if (lockpickingSkills.length === 0) {
    return NextResponse.json(
        {error: 'lockpickingSkills requires at least one skill tag'},
        {status: 400});
  }

  if (body.availabilityStatus &&
      !isTechnicianAvailability(body.availabilityStatus)) {
    return NextResponse.json(
        {error: 'Invalid availabilityStatus'}, {status: 400});
  }

  const technician = await createTechnician(authResult.orgId, {
    fullName,
    hourlyRate: hourlyRate!,
    lockpickingSkills,
    availabilityStatus: body.availabilityStatus ?? 'available',
    availabilityNote: body.availabilityNote?.trim() || null,
    isActive: body.isActive ?? true,
  });

  return NextResponse.json({
    ok: true,
    message: `Created technician ${technician.fullName}`,
    technician,
  });
}

export async function PATCH(request: Request) {
  const authResult = await authorize('technicians.manage');

  if ('error' in authResult) {
    return authResult.error;
  }

  let body: UpdateTechnicianRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({error: 'Invalid JSON payload'}, {status: 400});
  }

  if (!body.id) {
    return NextResponse.json({error: 'id is required'}, {status: 400});
  }

  if (body.fullName !== undefined && !body.fullName.trim()) {
    return NextResponse.json(
        {error: 'fullName cannot be empty'}, {status: 400});
  }

  if (body.hourlyRate !== undefined &&
      (!Number.isFinite(body.hourlyRate) || body.hourlyRate < 0)) {
    return NextResponse.json(
        {error: 'hourlyRate must be a non-negative number'}, {status: 400});
  }

  if (body.availabilityStatus !== undefined &&
      !isTechnicianAvailability(body.availabilityStatus)) {
    return NextResponse.json(
        {error: 'Invalid availabilityStatus'}, {status: 400});
  }

  if (body.lockpickingSkills !== undefined) {
    const normalized = normalizeSkills(body.lockpickingSkills);
    if (normalized.length === 0) {
      return NextResponse.json(
          {error: 'lockpickingSkills requires at least one skill tag'},
          {status: 400});
    }
  }

  const technician = await updateTechnician(authResult.orgId, body.id, {
    ...(body.fullName !== undefined ? {fullName: body.fullName.trim()} : {}),
    ...(body.hourlyRate !== undefined ? {hourlyRate: body.hourlyRate} : {}),
    ...(body.lockpickingSkills !== undefined ?
            {lockpickingSkills: normalizeSkills(body.lockpickingSkills)} :
            {}),
    ...(body.availabilityStatus !== undefined ?
            {availabilityStatus: body.availabilityStatus} :
            {}),
    ...(body.availabilityNote !== undefined ?
            {availabilityNote: body.availabilityNote?.trim() || null} :
            {}),
    ...(body.isActive !== undefined ? {isActive: body.isActive} : {}),
  });

  if (!technician) {
    return NextResponse.json({error: 'Technician not found'}, {status: 404});
  }

  return NextResponse.json({
    ok: true,
    message: `Updated technician ${technician.fullName}`,
    technician,
  });
}
