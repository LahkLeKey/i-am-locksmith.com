import {prisma} from '@/lib/db/prisma';

export type InventoryPartRecord = {
  id: string; orgId: string; sku: string; itemName: string;
  estimatedUnitCost: number;
  serviceLines: string[];
  location: string;
  onHand: number;
  reorderPoint: number;
  suggestedOrderQty: number;
  supplier: string;
  severity: string;
  compatibilityNote: string;
};

export type InventoryPartInput = {
  sku: string; itemName: string; serviceLines: string[]; location: string;
  estimatedUnitCost: number;
  onHand: number;
  reorderPoint: number;
  suggestedOrderQty: number;
  supplier: string;
  severity: string;
  compatibilityNote: string;
};

type InventoryPartClient = {
  inventoryPart: {
    findMany: (args: {
      where: {orgId: string}; orderBy: Array<{sku?: 'asc'; itemName?: 'asc'}>
    }) => Promise<InventoryPartRecord[]>;
    create: (args: {
      data:
          InventoryPartInput&{
            orgId: string
          }
    }) => Promise<InventoryPartRecord>;
    update: (args: {where: {id: string}; data: Partial<InventoryPartInput>}) =>
        Promise<InventoryPartRecord>;
    delete: (args: {where: {id: string}}) => Promise<InventoryPartRecord>;
  };
};

async function getClient(): Promise<InventoryPartClient> {
  return prisma as unknown as InventoryPartClient;
}

export async function listInventoryParts(orgId: string):
    Promise<InventoryPartRecord[]> {
  const client = await getClient();

  return client.inventoryPart.findMany({
    where: {orgId},
    orderBy: [{sku: 'asc'}, {itemName: 'asc'}],
  });
}

export async function createInventoryPart(
    orgId: string, data: InventoryPartInput): Promise<InventoryPartRecord> {
  const client = await getClient();

  return client.inventoryPart.create({data: {...data, orgId}});
}

export async function updateInventoryPart(
    id: string,
    data: Partial<InventoryPartInput>): Promise<InventoryPartRecord> {
  const client = await getClient();

  return client.inventoryPart.update({where: {id}, data});
}

export async function deleteInventoryPart(id: string):
    Promise<InventoryPartRecord> {
  const client = await getClient();

  return client.inventoryPart.delete({where: {id}});
}