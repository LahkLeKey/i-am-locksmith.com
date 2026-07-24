import {appendInventoryLedgerEntry, listInventorySkuLocationBalances} from '@/lib/inventory/ledger-repository';
import {getInventoryPartById} from '@/lib/inventory/parts-repository';
import {requireRouteContext} from '@/lib/rbac/guard';

export async function POST(request: Request) {
  try {
    const context = await requireRouteContext('/inventory');
    const orgId = context.orgId;

    if (!orgId) {
      return Response.json({error: 'Organization required'}, {status: 403});
    }

    const {sourceLocation, targetLocation, parts} = await request.json();

    if (!sourceLocation || !targetLocation || !parts || !Array.isArray(parts)) {
      return Response.json({error: 'Invalid request body'}, {status: 400});
    }

    if (sourceLocation === targetLocation) {
      return Response.json(
          {error: 'Source and target locations must be different'},
          {status: 400});
    }

    // Verify all parts exist and have sufficient stock
    const balances = await listInventorySkuLocationBalances(orgId);
    for (const {id, quantity} of parts) {
      const part = await getInventoryPartById(id);
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
    }

    // Execute transfers
    for (const {id, quantity} of parts) {
      const part = await getInventoryPartById(id);
      if (!part) continue;

      const reference = `transfer-${Date.now()}-${part.sku}`;

      // Decrement from source
      await appendInventoryLedgerEntry(orgId, {
        sku: part.sku,
        location: sourceLocation,
        delta: -quantity,
        kind: 'transfer_out',
        note: `Transferred to ${targetLocation.replace(/_/g, ' ')}`,
        referenceId: reference,
        referenceType: 'transfer',
      });

      // Increment to target
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
