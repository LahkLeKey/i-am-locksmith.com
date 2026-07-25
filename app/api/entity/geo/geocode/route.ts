import {randomUUID} from 'node:crypto';

import {GeoServiceError, geocodeAddress} from '@/lib/geo/service';
import {getAuthorizationContext} from '@/lib/rbac/server';
import {NextResponse} from 'next/server';

const ATTRIBUTION = {
  text: '© OpenStreetMap contributors',
  required: true,
} as const;

function errorResponse(
    requestId: string, code: string, message: string, status: number,
    retryable = false) {
  return NextResponse.json({
    error: {code, message, retryable, provider: 'nominatim', upstreamCode: null},
    requestId,
  }, {status});
}

export async function GET(request: Request) {
  const requestId = randomUUID();
  const context = await getAuthorizationContext();
  if (!context?.userId || !context.orgId) {
    return errorResponse(
        requestId, 'INVALID_REQUEST', 'Authentication is required.', 401);
  }
  const url = new URL(request.url);
  const query = url.searchParams.get('q')?.trim() ?? '';
  const requestedLimit = Number(url.searchParams.get('limit') ?? 5);

  if (!query) {
    return errorResponse(
        requestId, 'INVALID_REQUEST', 'An address query is required.', 400);
  }

  if (!Number.isInteger(requestedLimit) || requestedLimit < 1 ||
      requestedLimit > 10) {
    return errorResponse(
        requestId, 'INVALID_REQUEST', 'Limit must be between 1 and 10.', 400);
  }

  try {
    const result = await geocodeAddress({
      query,
      limit: requestedLimit,
      language: url.searchParams.get('language')?.trim() || 'en',
    });

    return NextResponse.json({
      data: result.data,
      provider: 'nominatim',
      cache: result.cache,
      attribution: ATTRIBUTION,
      requestId,
    });
  } catch (error) {
    if (error instanceof GeoServiceError) {
      return errorResponse(requestId, error.code, error.message, 429, true);
    }
    return errorResponse(
        requestId, 'UPSTREAM_UNAVAILABLE',
        'The location provider is temporarily unavailable.', 503, true);
  }
}