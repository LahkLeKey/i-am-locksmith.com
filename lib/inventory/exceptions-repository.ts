import {
  appendInventoryLedgerEntry,
  type InventoryLedgerEntryRecord,
  listInventoryLedgerEntries,
  listInventorySkuLocationBalances,
} from './ledger-repository';

export type InventoryExceptionCause = 'negative_on_hand'|'negative_available';

export type InventoryExceptionEntry = {
  id: string;
  sku: string;
  location: string;
  onHand: number;
  reserved: number;
  available: number;
  cause: InventoryExceptionCause;
  reasonCode: string;
  sourceKind: string;
  sourceReferenceId: string | null;
  sourceReferenceType: string | null;
  sourceNote: string | null;
  sourceAt: string;
  actor: string;
};

export type InventoryExceptionReconcileAction =
    'adjustment'|'receipt'|'reservation_correction';

export type ReconcileInventoryExceptionInput = {
  actionType: InventoryExceptionReconcileAction;
  sku: string;
  location: string;
  quantity: number;
  reasonCode: string;
  actorUserId: string;
  note?: string | null;
  correlationId?: string | null;
};

export type ReconcileInventoryExceptionResult = {
  ok: true;
  entryKind: string;
};

export type ReconcileInventoryExceptionErrorCode =
    'INVALID_RECONCILIATION_INPUT';

export type ReconcileInventoryExceptionError = Error&{
  code: ReconcileInventoryExceptionErrorCode;
};

function toKey(sku: string, location: string): string {
  return `${sku.toLowerCase()}::${location.toLowerCase()}`;
}

function parseActor(note: string | null): string {
  if (!note) {
    return 'unknown';
  }

  const match = note.match(/\bby\s+([\w:-]+)\b/i);
  if (!match?.[1]) {
    return 'unknown';
  }

  return match[1];
}

function buildReconcileError(message: string): ReconcileInventoryExceptionError {
  const error = new Error(message) as ReconcileInventoryExceptionError;
  error.code = 'INVALID_RECONCILIATION_INPUT';
  return error;
}

function resolveCausativeEntry(
    entries: InventoryLedgerEntryRecord[],
    cause: InventoryExceptionCause): InventoryLedgerEntryRecord | null {
  const orderedEntries = [...entries].sort((left, right) => {
    const createdAtComparison = Date.parse(left.createdAt) - Date.parse(right.createdAt);

    if (createdAtComparison !== 0) {
      return createdAtComparison;
    }

    const updatedAtComparison = Date.parse(left.updatedAt) - Date.parse(right.updatedAt);

    if (updatedAtComparison !== 0) {
      return updatedAtComparison;
    }

    return left.id.localeCompare(right.id);
  });
  let onHand = 0;
  let reserved = 0;
  let latestTransition: InventoryLedgerEntryRecord | null = null;

  for (const entry of orderedEntries) {
    const wasNegative =
        cause === 'negative_on_hand' ? onHand < 0 : onHand - reserved < 0;

    if (entry.kind === 'reservation' || entry.kind === 'reservation_release') {
      reserved += Math.abs(entry.delta) * (entry.kind === 'reservation' ? 1 : -1);
    } else {
      onHand += entry.delta;
    }

    const isNegative =
        cause === 'negative_on_hand' ? onHand < 0 : onHand - reserved < 0;

    if (!wasNegative && isNegative) {
      latestTransition = entry;
    }
  }

  return latestTransition ?? orderedEntries[orderedEntries.length - 1] ?? null;
}

export async function listInventoryExceptions(
    orgId: string): Promise<InventoryExceptionEntry[]> {
  const balances = await listInventorySkuLocationBalances(orgId);
  const negativeBalances =
      balances.filter((balance) => balance.onHand < 0 || balance.available < 0);

  if (negativeBalances.length === 0) {
    return [];
  }

  const sourceEntries = await Promise.all(negativeBalances.map(
      async (balance) => {
        const entries = await listInventoryLedgerEntries(orgId, {
          sku: balance.sku,
          location: balance.location,
        });
        const cause: InventoryExceptionCause =
            balance.onHand < 0 ? 'negative_on_hand' : 'negative_available';

        return {
          key: toKey(balance.sku, balance.location),
          latest: resolveCausativeEntry(entries, cause),
        };
      }));

  const sourceByKey = new Map(sourceEntries.map((entry) => [entry.key, entry.latest]));

  return negativeBalances.map((balance) => {
    const source = sourceByKey.get(toKey(balance.sku, balance.location));
    const cause: InventoryExceptionCause =
        balance.onHand < 0 ? 'negative_on_hand' : 'negative_available';

    return {
      id: `${balance.sku}::${balance.location}`,
      sku: balance.sku,
      location: balance.location,
      onHand: balance.onHand,
      reserved: balance.reserved,
      available: balance.available,
      cause,
      reasonCode: cause === 'negative_on_hand' ?
          'negative_on_hand' :
          'over_reserved',
      sourceKind: source?.kind ?? 'unknown',
      sourceReferenceId: source?.referenceId ?? null,
      sourceReferenceType: source?.referenceType ?? null,
      sourceNote: source?.note ?? null,
      sourceAt: source?.createdAt ?? new Date(0).toISOString(),
      actor: parseActor(source?.note ?? null),
    };
  });
}

export async function reconcileInventoryException(
    orgId: string,
    input: ReconcileInventoryExceptionInput):
    Promise<ReconcileInventoryExceptionResult> {
  const quantity = Number(input.quantity);

  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw buildReconcileError('quantity must be a whole number greater than 0');
  }

  const reasonCode = input.reasonCode.trim();
  if (!reasonCode) {
    throw buildReconcileError('reasonCode is required');
  }

  const sourceNote = input.note?.trim() ||
      `Inventory exception reconciliation by ${input.actorUserId}`;

  if (input.actionType === 'adjustment') {
    await appendInventoryLedgerEntry(orgId, {
      sku: input.sku,
      location: input.location,
      delta: quantity,
      kind: 'exception_adjustment',
      note: `${sourceNote} [${reasonCode}]`,
      referenceId: input.correlationId ?? null,
      referenceType: 'inventory_exception',
    });

    return {ok: true, entryKind: 'exception_adjustment'};
  }

  if (input.actionType === 'receipt') {
    await appendInventoryLedgerEntry(orgId, {
      sku: input.sku,
      location: input.location,
      delta: quantity,
      kind: 'exception_receipt',
      note: `${sourceNote} [${reasonCode}]`,
      referenceId: input.correlationId ?? null,
      referenceType: 'inventory_exception',
    });

    return {ok: true, entryKind: 'exception_receipt'};
  }

  await appendInventoryLedgerEntry(orgId, {
    sku: input.sku,
    location: input.location,
    delta: -quantity,
    kind: 'reservation_release',
    note: `${sourceNote} [${reasonCode}]`,
    referenceId: input.correlationId ?? null,
    referenceType: 'inventory_exception',
  });

  return {ok: true, entryKind: 'reservation_release'};
}
