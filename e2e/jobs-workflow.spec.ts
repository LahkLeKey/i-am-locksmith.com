import {expect, type Page, test} from '@playwright/test';

import {purgeTestJobs, TEST_CUSTOMER_NAME, TEST_JOB_NAME, TEST_LOCATION, TEST_SITE, TEST_SKU, TEST_TECHNICIAN_NAME,} from './support/job-fixture';

test.describe.configure({mode: 'serial'});

async function createTestJob(page: Page): Promise<string> {
  await page.goto('/jobs?view=all');
  await expect(page.getByRole('heading', {
    name: 'Jobs Operations'
  })).toBeVisible();
  await page.getByRole('button', {name: '+ New Job'}).click();

  await page.getByLabel('Job Name', {exact: true}).fill(TEST_JOB_NAME);
  await page.getByLabel('Customer', {exact: true}).fill(TEST_CUSTOMER_NAME);
  await page.getByLabel('Service address', {exact: true}).fill(TEST_SITE);
  await page.getByRole('button', {name: /Next/}).click();

  await page.getByLabel('Parts Selector').fill(TEST_SKU);
  await page.getByText(TEST_SKU, {exact: true})
      .locator('..')
      .getByRole('checkbox')
      .check();
  await page.getByRole('button', {name: /Next/}).click();

  const technicianSelect = page.getByRole('combobox', {name: 'Technician'});
  await technicianSelect.selectOption(
      {label: `${TEST_TECHNICIAN_NAME} · $90.00/hr`});
  await page.getByLabel('Estimated Minutes', {exact: true}).fill('60');
  await page.getByRole('button', {name: /Next/}).click();

  const createResponse = page.waitForResponse(
      (response) => response.url().endsWith('/api/jobs') &&
          response.request().method() === 'POST',
  );
  await page.getByRole('button', {name: 'Create Job'}).click();
  const response = await createResponse;
  expect(response.ok()).toBeTruthy();
  const payload = await response.json() as {job: {id: string; jobName: string}};
  expect(payload.job.jobName).toBe(TEST_JOB_NAME);

  await expect(page.getByRole('button', {
    name: `Open ${TEST_JOB_NAME}`
  })).toBeVisible();
  return payload.job.id;
}

async function openTestJob(page: Page): Promise<void> {
  await page.getByRole('button', {name: `Open ${TEST_JOB_NAME}`}).click();
  await expect(page.getByRole('heading', {name: TEST_JOB_NAME})).toBeVisible();
}

function activeWorkflow(page: Page) {
  return page.locator('div.fixed.inset-0.z-40');
}

test.beforeEach(async () => {
  await purgeTestJobs();
});

test.afterAll(async () => {
  await purgeTestJobs();
});

test(
    'operator can complete the full job workflow from intake through paid closeout',
    async ({page}) => {
      const jobId = await createTestJob(page);
      await openTestJob(page);
      const workflow = activeWorkflow(page);

      await expect(workflow.getByRole('heading', {
        name: TEST_JOB_NAME
      })).toBeVisible();
      await expect(
          workflow.getByText(`The job number ${jobId} remains unchanged.`))
          .toBeVisible();
      await expect(workflow.getByText('Saved', {exact: true})).toBeVisible();

      await workflow.getByRole('button', {name: 'Next', exact: true}).click();
      await expect(
          workflow.getByText('Quote + Inventory', {exact: true}).first())
          .toBeVisible();
      await workflow.getByLabel('Parts catalog').fill(TEST_SKU);
      const catalogPart =
          workflow.getByText('E2E deadbolt assembly', {exact: true})
              .locator('xpath=ancestor::label');
      await expect(catalogPart.getByText(TEST_SKU, {
        exact: false
      })).toBeVisible();
      await catalogPart.getByRole('checkbox').check();
      await workflow.getByLabel('Stock source').selectOption(TEST_LOCATION);
      await workflow.getByLabel('Estimated Minutes', {exact: true}).fill('45');

      const reserveResponse = page.waitForResponse(
          (response) => response.url().endsWith('/api/jobs') &&
              response.request().method() === 'PATCH' &&
              response.request().postData()?.includes(
                  '"inventoryAction":"reserve"') === true,
      );
      await workflow.getByRole('button', {name: 'Reserve', exact: true})
          .click();
      expect((await reserveResponse).ok()).toBeTruthy();
      await workflow.getByRole('button', {name: 'Save', exact: true}).click();

      await workflow.getByRole('button', {name: 'Next', exact: true}).click();
      await expect(workflow.getByText('Time Clock Review')).toBeVisible();
      await workflow.getByRole('button', {name: 'Start New Pair'}).click();
      await workflow.getByRole('button', {name: 'Close Open Pair'}).click();
      await expect(workflow.getByText('All entries paired')).toBeVisible();
      await workflow.getByRole('button', {name: 'Save Ledger Changes'}).click();

      await workflow.getByRole('button', {name: 'Next', exact: true}).click();
      await expect(workflow.getByRole('heading', {
        name: 'Ready for Payment'
      })).toBeVisible();
      const invoiceResponse = page.waitForResponse(
          (response) => response.url().endsWith('/api/jobs/closeout') &&
              response.request().method() === 'POST' &&
              response.request().postData()?.includes(
                  '"action":"ready_for_payment"') === true,
      );
      await workflow.getByRole('button', {name: 'Mark Ready for Payment'})
          .click();
      expect((await invoiceResponse).ok()).toBeTruthy();

      await expect(workflow.getByRole('heading', {
        name: 'Payment summary'
      })).toBeVisible();
      await workflow.getByRole('button', {name: 'Preview receipt'}).click();
      const receiptDialog = page.getByRole('dialog', {name: 'Receipt preview'});
      await expect(receiptDialog).toBeVisible();
      await expect(receiptDialog.getByText(jobId, {exact: true})).toBeVisible();
      await expect(receiptDialog.getByRole('link', {
        name: 'Download PDF'
      })).toHaveAttribute('href', /\/api\/invoices\/.+\/receipt/);
      await page.getByRole('button', {name: 'Close receipt preview'}).click();

      await workflow.getByRole('button', {name: 'Record payment', exact: true})
          .first()
          .click();
      const paymentForm =
          page.getByLabel('Amount').locator('xpath=ancestor::form');
      const paymentResponse = page.waitForResponse(
          (response) => response.url().endsWith('/api/invoices') &&
              response.request().method() === 'POST' &&
              response.request().postData()?.includes(
                  '"action":"record_payment"') === true,
      );
      await paymentForm
          .getByRole('button', {name: 'Record payment', exact: true})
          .click();
      expect((await paymentResponse).ok()).toBeTruthy();
      await expect(workflow.getByText('Paid', {exact: true}).first())
          .toBeVisible();

      const closeResponse = page.waitForResponse(
          (response) => response.url().endsWith('/api/jobs/closeout') &&
              response.request().method() === 'POST' &&
              response.request().postData()?.includes('"action":"close"') ===
                  true,
      );
      await workflow.getByRole('button', {name: 'Close job'}).click();
      expect((await closeResponse).ok()).toBeTruthy();
      await expect(workflow.getByText('Closed ticket')).toBeVisible();
      await expect(
          workflow.getByText(
              'All workflow steps are complete and available for read-only review.'))
          .toBeVisible();
    });

test(
    'operator can delete a non-finalized job from the workflow action bar',
    async ({page}) => {
      const jobId = await createTestJob(page);
      await openTestJob(page);
      const workflow = activeWorkflow(page);

      await workflow.getByRole('button', {name: `Delete ${TEST_JOB_NAME}`})
          .click();
      const dialog = page.getByText('Delete Job?').locator('..');
      await expect(dialog).toContainText(jobId);

      const deleteResponse = page.waitForResponse(
          (response) => response.url().endsWith('/api/jobs') &&
              response.request().method() === 'DELETE',
      );
      await page.getByRole('button', {name: 'Confirm Delete'}).click();
      expect((await deleteResponse).ok()).toBeTruthy();

      await expect(page.getByRole('heading', {
        name: TEST_JOB_NAME
      })).toBeHidden();
      await expect(page.getByRole('button', {
        name: `Open ${TEST_JOB_NAME}`
      })).toHaveCount(0);
    });
