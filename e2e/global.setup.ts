import {clerk, clerkSetup} from '@clerk/testing/playwright';
import {test as setup} from '@playwright/test';
import {mkdir} from 'node:fs/promises';

import {provisionJobWorkflowFixtures} from './support/job-fixture';

const authFile = 'e2e/.auth/user.json';

setup.describe.configure({mode: 'serial'});

setup('provision fixtures and authenticate', async ({page}) => {
  const emailAddress =
      process.env.E2E_CLERK_USER_EMAIL ?? 'zephrym.mn@gmail.com';

  await clerkSetup();
  await provisionJobWorkflowFixtures();

  await page.goto('/');
  await clerk.signIn({page, emailAddress});
  await page.goto('/jobs?view=all');
  await page.waitForURL(/\/jobs/);

  if (page.url().includes('/access') || page.url().includes('/sign-in')) {
    throw new Error(
        'The E2E Clerk user must have an active organization with Jobs and invoice payment permissions.');
  }

  await mkdir('e2e/.auth', {recursive: true});
  await page.context().storageState({path: authFile});
});
