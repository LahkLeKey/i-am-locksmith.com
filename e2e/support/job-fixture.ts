import {PrismaClient} from '@prisma/client';

export const TEST_JOB_NAME = 'Playwright Test Job';
export const TEST_CUSTOMER_NAME = 'Playwright Customer';
export const TEST_SITE = '101 E2E Test Way';
export const TEST_SKU = 'E2E-LOCK-01';
export const TEST_LOCATION = 'Playwright Test Van';
export const TEST_TECHNICIAN_NAME = 'Playwright Technician';
const PRODUCTION_ORG_ID = 'org_3GofNoNHjMe4weYK3LYnsNv08VO';
const PRODUCTION_ACKNOWLEDGMENT = 'Playwright Test Job';

function assertResetIsAllowed(): void {
  if (process.env.E2E_ALLOW_DATABASE_RESET !== 'true') {
    throw new Error(
        'Set E2E_ALLOW_DATABASE_RESET=true to allow exact-name E2E fixture cleanup.');
  }

  const baseURL = process.env.E2E_BASE_URL ?? 'https://www.i-am-locksmith.com';
  const targetsProduction =
      /^(https?:\/\/)?(www\.)?i-am-locksmith\.com/i.test(baseURL);

  if (targetsProduction &&
      process.env.E2E_ALLOW_PRODUCTION_MUTATIONS !==
          PRODUCTION_ACKNOWLEDGMENT) {
    throw new Error(`Set E2E_ALLOW_PRODUCTION_MUTATIONS="${
        PRODUCTION_ACKNOWLEDGMENT}" to run the exact-name workflow fixture against production.`);
  }

  if (!(process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL)) {
    throw new Error(
        'E2E_DATABASE_URL or DATABASE_URL must point to the database used by the test app.');
  }

  const orgId = process.env.E2E_ORG_ID ?? PRODUCTION_ORG_ID;
  if (targetsProduction && orgId !== PRODUCTION_ORG_ID) {
    throw new Error(
        'Production E2E_ORG_ID does not match the verified Clerk organization.');
  }
}

function createTestClient(): PrismaClient {
  assertResetIsAllowed();
  return new PrismaClient({
    datasourceUrl: process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL,
  });
}

export async function purgeTestJobs(): Promise<void> {
  const prisma = createTestClient();
  const orgId = process.env.E2E_ORG_ID ?? PRODUCTION_ORG_ID;

  try {
    const jobs = await prisma.jobRecord.findMany({
      where: {orgId, jobName: TEST_JOB_NAME},
      select: {id: true},
    });
    const jobIds = jobs.map((job) => job.id);
    const invoices = jobIds.length > 0 ? await prisma.invoice.findMany({
      where: {orgId, jobId: {in : jobIds}},
      select: {id: true},
    }) :
                                         [];
    const invoiceIds = invoices.map((invoice) => invoice.id);

    await prisma.$transaction([
      prisma.invoicePayment.deleteMany(
          {where: {orgId, invoiceId: {in : invoiceIds}}}),
      prisma.invoice.deleteMany({where: {orgId, jobId: {in : jobIds}}}),
      prisma.inventoryLedgerEntry.deleteMany({
        where: {orgId, referenceType: 'job', referenceId: {in : jobIds}},
      }),
      prisma.jobRecord.deleteMany({where: {orgId, id: {in : jobIds}}}),
    ]);
  } finally {
    await prisma.$disconnect();
  }
}

export async function provisionJobWorkflowFixtures(): Promise<void> {
  const prisma = createTestClient();
  const orgId = process.env.E2E_ORG_ID ?? PRODUCTION_ORG_ID;

  try {
    await purgeTestJobs();
    await prisma.$transaction([
      prisma.technician.deleteMany(
          {where: {orgId, fullName: TEST_TECHNICIAN_NAME}}),
      prisma.inventoryLedgerEntry.deleteMany({where: {orgId, sku: TEST_SKU}}),
      prisma.inventoryPart.deleteMany({where: {orgId, sku: TEST_SKU}}),
      prisma.inventoryLocation.deleteMany(
          {where: {orgId, name: TEST_LOCATION}}),
    ]);
    await prisma.inventoryLocation.create({
      data: {orgId, name: TEST_LOCATION, type: 'van'},
    });
    await prisma.inventoryPart.create({
      data: {
        orgId,
        sku: TEST_SKU,
        itemName: 'E2E deadbolt assembly',
        estimatedUnitCost: 42.5,
        serviceLines: ['mobile'],
        location: TEST_LOCATION,
        onHand: 10,
        reorderPoint: 2,
        suggestedOrderQty: 5,
        supplier: 'Playwright Supply',
        severity: 'low',
        compatibilityNote: 'Reserved for automated workflow testing.',
      },
    });
    await prisma.inventoryLedgerEntry.create({
      data: {
        orgId,
        sku: TEST_SKU,
        location: TEST_LOCATION,
        delta: 10,
        kind: 'opening_balance',
        note: 'Playwright workflow fixture',
      },
    });
    await prisma.technician.create({
      data: {
        orgId,
        fullName: TEST_TECHNICIAN_NAME,
        lockpickingSkills: ['residential'],
        hourlyRate: 90,
        availabilityStatus: 'available',
        availabilityNote: 'Reserved for automated workflow testing.',
        isActive: true,
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}
