import { test as base, expect } from "@playwright/test";

import { BomWorkbenchPage } from "../pages/BomWorkbenchPage";
import {
  createDatasetSession,
  type DatasetSession,
} from "./datasetSession";

type BomFixtures = {
  bomWorkbench: BomWorkbenchPage;
  datasetSession: DatasetSession;
};

export const test = base.extend<BomFixtures>({
  datasetSession: async ({}, use) => {
    await use(createDatasetSession());
  },
  bomWorkbench: async ({ page, request, datasetSession }, use) => {
    await use(new BomWorkbenchPage(page, request, datasetSession));
  },
});

export { expect };
