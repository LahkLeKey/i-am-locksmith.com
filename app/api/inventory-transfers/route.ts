import {appendInventoryLedgerEntry, listInventorySkuLocationBalances} from '@/lib/inventory/ledger-repository';
import {registerInventoryLocation} from '@/lib/inventory/location-repository';
import {getInventoryPartById} from '@/lib/inventory/parts-repository';
import {authorizePermission, getAuthorizationContext} from '@/lib/rbac/server';

import {LOCATION_TYPES, type LocationType} from '../../../lib/inventory/locations';

export async function POST(request: Request) {
  try {
    const context = await getAuthorizationContext();

    if (!context) {
      return Response.json({error: 'Unauthorized'}, {status: 401});
    }

    const decision = await authorizePermission('inventory.transfer');

    if (decision.state === 'unauthenticated') {
      return Response.json({error: 'Unauthorized'}, {status: 401});
    }

    if (decision.state === 'forbidden') {
      return Response.json({error: 'Forbidden'}, {status: 403});
    }

    const orgId = context.orgId;

    if (!orgId) {
      return Response.json({error: 'Organization required'}, {status: 403});
    }

    const {sourceLocation, targetLocation, targetLocationType, parts} =
        await request.json();

    if (!sourceLocation || !targetLocation || !Array.isArray(parts) ||
        parts.length === 0) {
      return Response.json({error: 'Invalid request body'}, {status: 400});
    }

    const hasInvalidPart = parts.some((part: unknown) => {
      if (!part || typeof part !== 'object') return true;
      const {id, quantity} = part as {
        id?: unknown;
        quantity?: unknown
      };
      return typeof id !== 'string' || id.trim().length === 0 ||
          typeof quantity !== 'number' || !Number.isInteger(quantity) ||
          quantity <= 0;
    });

    if (hasInvalidPart) {
      return Response.json(
          {error: 'Each part requires an id and a positive whole quantity'},
          {status: 400});
    }

    if (sourceLocation.trim().toLowerCase() ===
        targetLocation.trim().toLowerCase()) {
      return Response.json(
          {error: 'Source and target locations must be different'},
          {status: 400});
    }

    if (targetLocationType !== undefined &&
        !LOCATION_TYPES.includes(targetLocationType as LocationType)) {
      return Response.json(
          {error: 'Location type must be garage, van, or shop'}, {status: 400});
    }

    const balances = await listInventorySkuLocationBalances(orgId);
    const transferPlan = [];

    for (const {id, quantity} of parts) {
      const part = await getInventoryPartById(orgId, id);
      if (!part) {
        return Response.json({error: `Part ${id} not found`}, {status: 404});
      }

      const balance = balances.find(
          b => b.sku.toLowerCase() === part.sku.toLowerCase() &&
              b.location.toLowerCase() === sourceLocation.toLowerCase());

      if (!balance || balance.available < quantity) {
        return Response.json(
            {error: `Insufficient stock of ${part.sku} in ${sourceLocation}`},
            {status: 400});
      }

      transferPlan.push({part, quantity});
    }

    if (targetLocationType) {
      await registerInventoryLocation(
          orgId, targetLocation, targetLocationType as LocationType);
    }

    for (const {part, quantity} of transferPlan) {
      const reference = `transfer-${Date.now()}-${part.sku}`;

      await appendInventoryLedgerEntry(orgId, {
        sku: part.sku,
        location: sourceLocation,
        delta: -quantity,
        kind: 'transfer_out',
        note: `Transferred to ${targetLocation.replace(/_/g, ' ')}`,
        referenceId: reference,
        referenceType: 'transfer',
      });

      await appendInventoryLedgerEntry(orgId, {
        sku: part.sku,
        location: targetLocation,
        delta: quantity,
        kind: 'transfer_in',
        note: `Received from ${sourceLocation.replace(/_/g, ' ')}`,
        referenceId: reference,
        referenceType: 'transfer',
      });
    }

    return Response.json(
        {
          success: true,
          message: `Transferred ${parts.length} part(s) successfully`,
        },
        {status: 200});
  } catch (error) {
    console.error('Transfer error:', error);
    return Response.json({error: 'Transfer failed'}, {status: 500});
  }
}
