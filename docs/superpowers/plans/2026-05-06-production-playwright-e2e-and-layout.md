# Production Playwright E2E And Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立桌面 Chromium 分层 Playwright E2E 质量门禁，并优化前端工作台布局，防止计算区和分析区显示不完全。

**Architecture:** 先补稳定选择器、Playwright 配置、fixture、页面对象和布局测量工具，再用 `@layout` E2E 锁住历史布局回归，随后按测试结果优化 `BomWorkbench`、底部计算区和右侧分析区的 CSS。业务 E2E 分成 smoke、regression、api、error、layout 五层，第一版只跑桌面 Chromium 且默认单 worker。

**Tech Stack:** Vue 3, TypeScript, Vite, Element Plus, vxe-table, Playwright Test, Vitest, FastAPI, conda `test`

---

## Scope Check

本计划覆盖一个连贯目标：生产级桌面 E2E 和支撑它的前端布局优化。它不引入 Firefox、WebKit、移动端测试矩阵，也不加入 GitHub Actions 工作流；CI 只保留兼容配置。

## File Structure

**新增文件：**

- `frontend/e2e/data/not-a-workbook.txt`：客户端文件类型校验 fixture。
- `frontend/e2e/data/broken-workbook.xlsx`：扩展名合法但内容损坏的服务端校验 fixture。
- `frontend/e2e/fixtures/datasetSession.ts`：保存当前测试导入得到的 `datasetId`。
- `frontend/e2e/fixtures/files.ts`：集中管理 E2E 文件路径。
- `frontend/e2e/fixtures/bomTest.ts`：扩展 Playwright fixture，提供 `bomWorkbench` 页面对象。
- `frontend/e2e/utils/rowCount.ts`：业务行数读取工具，禁止使用虚拟滚动 DOM 行数。
- `frontend/e2e/utils/layoutMetrics.ts`：计算区、分析区、容器裁切检测工具。
- `frontend/e2e/pages/BomWorkbenchPage.ts`：封装上传、筛选、搜索、展开、导出、布局断言。
- `frontend/e2e/specs/smoke.spec.ts`：快速可用性门禁。
- `frontend/e2e/specs/desktop-layout.spec.ts`：P0 布局回归门禁。
- `frontend/e2e/specs/search-and-filter.spec.ts`：搜索和筛选回归。
- `frontend/e2e/specs/tree-and-selection.spec.ts`：树展开折叠和焦点分析回归。
- `frontend/e2e/specs/export.spec.ts`：导出口径和 API 断言。
- `frontend/e2e/specs/error-path.spec.ts`：客户端校验、坏 Excel、后端失败路径。

**修改文件：**

- `.gitignore`：忽略 Playwright 产物。
- `frontend/package.json`：增加分层 E2E 命令。
- `frontend/playwright.config.ts`：桌面 Chromium 单项目、单 worker、报告和产物配置。
- `frontend/src/pages/BomWorkbench.vue`：补稳定 test id，并优化整体工作台高度分配。
- `frontend/src/components/upload/UploadPanel.vue`：补 `data-testid`。
- `frontend/src/components/common/ErrorDrawer.vue`：补 `data-testid`，限制错误区高度并允许滚动。
- `frontend/src/components/bom/BomGridToolbar.vue`：补稳定 test id。
- `frontend/src/components/bom/BomGrid.vue`：补 `data-testid`。
- `frontend/src/components/bom/BomGridStatusBar.vue`：优化计算区在桌面宽度下的高度和列数。
- `frontend/src/components/bom/NodeDetailPanel.vue`：保证节点详情区最小可用高度并允许滚动。
- `frontend/src/components/analysis/AnomalyCenter.vue`：保证异常中心最小可用高度并允许滚动。
- `frontend/src/pages/BomWorkbench.spec.ts`：补稳定选择器单测。

**删除文件：**

- `frontend/playwright-report/index.html`：历史提交的 Playwright HTML report 产物，后续改为忽略，不再纳入版本控制。
- `frontend/test-results/.last-run.json`：历史提交的 Playwright 运行状态产物，后续改为忽略，不再纳入版本控制。
- `frontend/e2e/bom-upload-and-filter.spec.ts`：内容迁移到新的分层 specs 后删除，避免旧测试被误维护。

---

### Task 1: Playwright 配置、脚本和产物治理

**Files:**
- Modify: `.gitignore`
- Modify: `frontend/package.json`
- Modify: `frontend/playwright.config.ts`
- Create: `frontend/e2e/data/not-a-workbook.txt`
- Create: `frontend/e2e/data/broken-workbook.xlsx`
- Delete: `frontend/playwright-report/index.html`
- Delete: `frontend/test-results/.last-run.json`

- [ ] **Step 1: 更新 `.gitignore` 忽略 Playwright 产物**

在 `.gitignore` 末尾加入：

```gitignore
frontend/playwright-report/
frontend/test-results/
frontend/blob-report/
```

- [ ] **Step 2: 移除历史提交的 Playwright 产物**

Delete these tracked generated files so `.gitignore` can take effect:

```powershell
git rm --cached frontend/playwright-report/index.html frontend/test-results/.last-run.json
```

- [ ] **Step 3: 创建客户端校验 fixture**

Create `frontend/e2e/data/not-a-workbook.txt` with this content:

```text
这不是 Excel 工作簿，用于验证前端会拦截非 .xlsx 文件。
```

- [ ] **Step 4: 创建服务端校验 fixture**

Create `frontend/e2e/data/broken-workbook.xlsx` with this content:

```text
not a valid xlsx workbook
```

虽然扩展名是 `.xlsx`，内容不是有效 Excel；该文件用于触发后端 `INVALID_WORKBOOK`。

- [ ] **Step 5: 更新 `frontend/package.json` 脚本**

Replace the `scripts` block with:

```json
{
  "dev": "vite",
  "build": "vite build",
  "test": "vitest run",
  "test:e2e": "playwright test",
  "test:e2e:smoke": "playwright test --grep @smoke",
  "test:e2e:regression": "playwright test --grep \"@smoke|@regression\"",
  "test:e2e:api": "playwright test --grep @api",
  "test:e2e:layout": "playwright test --grep @layout",
  "test:e2e:headed": "playwright test --headed",
  "test:e2e:ui": "playwright test --ui",
  "test:e2e:debug": "playwright test --debug",
  "test:e2e:report": "playwright show-report"
}
```

- [ ] **Step 6: 更新 `frontend/playwright.config.ts`**

Replace the file with:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [["list"], ["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  outputDir: "test-results",
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1600, height: 900 },
      },
    },
  ],
  webServer: [
    {
      command:
        "conda run -n test uvicorn app.main:app --host 127.0.0.1 --port 8000 --app-dir ../backend",
      port: 8000,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: "npm run dev -- --host 127.0.0.1 --port 5173 --strictPort",
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
});
```

- [ ] **Step 7: 验证 Playwright 配置可解析且不会丢失现有测试发现**

Run:

```powershell
cd frontend; npx playwright test --list
```

Expected: command exits `0` and still能发现当前已有的 legacy spec；`./e2e/specs` 可以在后续任务落地前保持为空。

- [ ] **Step 8: Commit**

```powershell
git add .gitignore frontend/package.json frontend/playwright.config.ts frontend/e2e/data/not-a-workbook.txt frontend/e2e/data/broken-workbook.xlsx
git commit -m "test: configure desktop playwright e2e"
```

---

### Task 2: 稳定选择器和组件级回归

**Files:**
- Modify: `frontend/src/pages/BomWorkbench.spec.ts`
- Modify: `frontend/src/pages/BomWorkbench.vue`
- Modify: `frontend/src/components/upload/UploadPanel.vue`
- Modify: `frontend/src/components/common/ErrorDrawer.vue`
- Modify: `frontend/src/components/bom/BomGridToolbar.vue`
- Modify: `frontend/src/components/bom/BomGrid.vue`
- Modify: `frontend/src/components/bom/NodeDetailPanel.vue`
- Modify: `frontend/src/components/analysis/AnomalyCenter.vue`

- [ ] **Step 1: 写失败单测，要求关键测试 ID 存在**

Append this test to `frontend/src/pages/BomWorkbench.spec.ts`:

```ts
test("renders stable hooks for desktop e2e tests", () => {
  const { container } = render(BomWorkbench);

  expect(screen.getByTestId("workbench")).toBeInTheDocument();
  expect(screen.getByTestId("upload-panel")).toBeInTheDocument();
  expect(screen.getByTestId("toolbar-search")).toBeInTheDocument();
  expect(screen.getByTestId("toolbar-amount-min")).toBeInTheDocument();
  expect(screen.getByTestId("export-current-button")).toBeInTheDocument();
  expect(screen.getByTestId("bom-grid")).toBeInTheDocument();
  expect(screen.getByTestId("side-panels")).toBeInTheDocument();
  expect(screen.getByTestId("node-detail-panel")).toBeInTheDocument();
  expect(screen.getByTestId("anomaly-center")).toBeInTheDocument();
  expect(container.querySelector('[data-testid="error-drawer"]')).toBeNull();
});
```

- [ ] **Step 2: 运行单测确认失败**

Run:

```powershell
cd frontend; npm run test -- src/pages/BomWorkbench.spec.ts
```

Expected: FAIL because at least `workbench` or `toolbar-search` test id is not found.

- [ ] **Step 3: 给 `BomWorkbench.vue` 补测试 ID**

Change the template opening tags:

```vue
<section class="workbench" data-testid="workbench">
```

```vue
<div class="layout" data-testid="workbench-layout">
```

```vue
<div class="side-panels" data-testid="side-panels">
```

- [ ] **Step 4: 给 `UploadPanel.vue` 补测试 ID**

Add `data-testid="upload-panel"` to the `<el-upload>`:

```vue
<el-upload
  class="upload-panel"
  data-testid="upload-panel"
  :class="{ 'upload-panel--compact': compact }"
  :drag="!compact"
  accept=".xlsx"
  :auto-upload="false"
  :show-file-list="false"
  :on-change="handleFileChange"
  aria-label="上传 Excel"
>
```

- [ ] **Step 5: 给 `ErrorDrawer.vue` 补测试 ID**

Change the template:

```vue
<aside v-if="errors.length" class="error-drawer" data-testid="error-drawer">
  <span class="error-drawer__title">导入提示</span>
  <ul class="error-drawer__list">
    <li
      v-for="item in groupedErrors"
      :key="item.key"
      class="error-drawer__item"
      data-testid="error-item"
    >
      <span class="error-drawer__code">{{ item.code }}</span>
      <span class="error-drawer__message">{{ item.message }}</span>
      <span v-if="item.count > 1" class="error-drawer__count">{{ item.count }} 条</span>
    </li>
  </ul>
</aside>
```

- [ ] **Step 6: 给 `BomGridToolbar.vue` 补测试 ID**

Add these attributes:

```vue
<input
  data-testid="toolbar-search"
  type="text"
  :value="search"
  aria-label="搜索编码/名称"
  placeholder="搜索编码/名称"
  @input="emitSearchChange"
/>
```

```vue
<input
  data-testid="toolbar-amount-min"
  type="text"
  :value="amountMin"
  aria-label="金额下限"
  inputmode="decimal"
  placeholder="金额下限"
  @input="emitAmountMinChange"
/>
```

```vue
<button type="button" data-testid="export-current-button" @click="emit('export-current')">
  导出当前结果
</button>
```

- [ ] **Step 7: 给 `BomGrid.vue`、`NodeDetailPanel.vue`、`AnomalyCenter.vue` 补测试 ID**

Change the root tags:

```vue
<div class="bom-grid-container" data-testid="bom-grid">
```

```vue
<section class="node-detail-panel" data-testid="node-detail-panel">
```

```vue
<section class="anomaly-center" data-testid="anomaly-center">
```

- [ ] **Step 8: 运行单测确认通过**

Run:

```powershell
cd frontend; npm run test -- src/pages/BomWorkbench.spec.ts
```

Expected: PASS.

- [ ] **Step 9: Commit**

```powershell
git add frontend/src/pages/BomWorkbench.spec.ts frontend/src/pages/BomWorkbench.vue frontend/src/components/upload/UploadPanel.vue frontend/src/components/common/ErrorDrawer.vue frontend/src/components/bom/BomGridToolbar.vue frontend/src/components/bom/BomGrid.vue frontend/src/components/bom/NodeDetailPanel.vue frontend/src/components/analysis/AnomalyCenter.vue
git commit -m "test: add stable e2e selectors"
```

---

### Task 3: E2E fixture、页面对象和工具层

**Files:**
- Create: `frontend/e2e/fixtures/datasetSession.ts`
- Create: `frontend/e2e/fixtures/files.ts`
- Create: `frontend/e2e/fixtures/bomTest.ts`
- Create: `frontend/e2e/utils/rowCount.ts`
- Create: `frontend/e2e/utils/layoutMetrics.ts`
- Create: `frontend/e2e/pages/BomWorkbenchPage.ts`

- [ ] **Step 1: 创建数据集会话 fixture**

Create `frontend/e2e/fixtures/datasetSession.ts`:

```ts
export type DatasetSession = {
  datasetId: string;
};

export function createDatasetSession(): DatasetSession {
  return { datasetId: "" };
}
```

- [ ] **Step 2: 创建文件路径 fixture**

Create `frontend/e2e/fixtures/files.ts`:

```ts
import path from "path";
import { fileURLToPath } from "url";

const fixtureDir = path.dirname(fileURLToPath(import.meta.url));

export const validWorkbookPath = path.resolve(
  fixtureDir,
  "../../../BOM成本查询_2026041415170958.xlsx",
);

export const invalidTextPath = path.resolve(
  fixtureDir,
  "../data/not-a-workbook.txt",
);

export const brokenWorkbookPath = path.resolve(
  fixtureDir,
  "../data/broken-workbook.xlsx",
);
```

- [ ] **Step 3: 创建业务行数工具**

Create `frontend/e2e/utils/rowCount.ts`:

```ts
import type { Page } from "@playwright/test";

export async function readCurrentViewRowCount(page: Page): Promise<number> {
  const statusText = await page.getByTestId("status-current-row-count").innerText();
  const matched = statusText.match(/\d+/);
  if (!matched) {
    throw new Error(`无法从状态栏解析当前视图行数: ${statusText}`);
  }
  return Number(matched[0]);
}

export async function readGridBodyScrollHeight(page: Page): Promise<number> {
  return page
    .locator(".vxe-table--main-wrapper .vxe-table--body-inner-wrapper")
    .evaluate((node) => {
      if (!(node instanceof HTMLElement)) {
        throw new Error("表格滚动容器不存在");
      }
      return node.scrollHeight;
    });
}
```

- [ ] **Step 4: 创建布局指标工具**

Create `frontend/e2e/utils/layoutMetrics.ts`:

```ts
import type { Page } from "@playwright/test";

export type WorkbenchLayoutMetrics = {
  sideClientHeight: number;
  sideScrollHeight: number;
  sideOverflow: number;
  statusBarHeight: number;
  uploadPanelHeight: number;
  errorDrawerHeight: number;
  nodeDetailClientHeight: number;
  anomalyClientHeight: number;
  anomalyScrollHeight: number;
  anomalyOverflowY: string;
  pageScrollHeight: number;
  pageClientHeight: number;
};

export async function readWorkbenchLayoutMetrics(
  page: Page,
): Promise<WorkbenchLayoutMetrics> {
  return page.evaluate(() => {
    const sidePanels = document.querySelector('[data-testid="side-panels"]');
    const statusBar = document.querySelector(".status-bar");
    const uploadPanel = document.querySelector('[data-testid="upload-panel"]');
    const errorDrawer = document.querySelector('[data-testid="error-drawer"]');
    const nodeDetailPanel = document.querySelector('[data-testid="node-detail-panel"]');
    const anomalyCenter = document.querySelector('[data-testid="anomaly-center"]');

    if (
      !(sidePanels instanceof HTMLElement) ||
      !(statusBar instanceof HTMLElement) ||
      !(uploadPanel instanceof HTMLElement) ||
      !(nodeDetailPanel instanceof HTMLElement) ||
      !(anomalyCenter instanceof HTMLElement)
    ) {
      throw new Error("布局关键容器不存在，无法读取桌面布局指标");
    }

    return {
      sideClientHeight: sidePanels.clientHeight,
      sideScrollHeight: sidePanels.scrollHeight,
      sideOverflow: sidePanels.scrollHeight - sidePanels.clientHeight,
      statusBarHeight: statusBar.getBoundingClientRect().height,
      uploadPanelHeight: uploadPanel.getBoundingClientRect().height,
      errorDrawerHeight:
        errorDrawer instanceof HTMLElement
          ? errorDrawer.getBoundingClientRect().height
          : 0,
      nodeDetailClientHeight: nodeDetailPanel.clientHeight,
      anomalyClientHeight: anomalyCenter.clientHeight,
      anomalyScrollHeight: anomalyCenter.scrollHeight,
      anomalyOverflowY: getComputedStyle(anomalyCenter).overflowY,
      pageScrollHeight: document.documentElement.scrollHeight,
      pageClientHeight: document.documentElement.clientHeight,
    };
  });
}
```

- [ ] **Step 5: 创建页面对象**

Create `frontend/e2e/pages/BomWorkbenchPage.ts`:

```ts
import { expect, type APIRequestContext, type Page } from "@playwright/test";

import type { DatasetSession } from "../fixtures/datasetSession";
import {
  brokenWorkbookPath,
  invalidTextPath,
  validWorkbookPath,
} from "../fixtures/files";
import { readWorkbenchLayoutMetrics } from "../utils/layoutMetrics";
import {
  readCurrentViewRowCount,
  readGridBodyScrollHeight,
} from "../utils/rowCount";

export type ExportQueryPayload = {
  search?: string;
  materialAttr?: string;
  amountMin?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export class BomWorkbenchPage {
  constructor(
    private readonly page: Page,
    private readonly request: APIRequestContext,
    private readonly datasetSession: DatasetSession,
  ) {}

  async open(): Promise<void> {
    await this.page.goto("/");
    await expect(this.page.getByTestId("upload-panel")).toBeVisible();
  }

  async importValidWorkbook(): Promise<void> {
    const importResponsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes("/api/import") &&
        response.request().method() === "POST",
    );
    await this.page.locator('input[type="file"]').setInputFiles(validWorkbookPath);
    const importResponse = await importResponsePromise;
    const importPayload = (await importResponse.json()) as { dataset_id?: string };
    if (!importPayload.dataset_id) {
      throw new Error(`导入响应缺少 dataset_id: ${JSON.stringify(importPayload)}`);
    }
    this.datasetSession.datasetId = importPayload.dataset_id;
    await this.expectGridReady();
  }

  async importClientRejectedFile(): Promise<void> {
    await this.page.locator('input[type="file"]').setInputFiles(invalidTextPath);
  }

  async importBrokenWorkbook(): Promise<void> {
    await this.page.locator('input[type="file"]').setInputFiles(brokenWorkbookPath);
  }

  async importValidWorkbookExpectingFailure(): Promise<void> {
    await this.page.locator('input[type="file"]').setInputFiles(validWorkbookPath);
  }

  async expectGridReady(): Promise<void> {
    await expect(this.page.getByTestId("bom-grid")).toBeVisible();
    await expect.poll(() => readCurrentViewRowCount(this.page)).toBeGreaterThan(0);
  }

  async expectSummaryReady(): Promise<void> {
    await expect(this.page.getByTestId("status-current-summary")).toContainText(
      "当前范围汇总",
    );
    await expect(this.page.getByTestId("status-focus-summary")).toContainText(
      "焦点节点汇总",
    );
    await expect(this.page.getByTestId("status-selection-summary")).toContainText(
      "框选结果汇总",
    );
    await expect(this.page.getByTestId("status-attr-breakdown")).toContainText(
      "属性分布",
    );
  }

  async currentRowCount(): Promise<number> {
    return readCurrentViewRowCount(this.page);
  }

  async search(keyword: string): Promise<void> {
    await this.page.getByTestId("toolbar-search").fill(keyword);
  }

  async setAmountMin(value: string): Promise<void> {
    await this.page.getByTestId("toolbar-amount-min").fill(value);
  }

  async filterMaterialAttr(attr: string): Promise<void> {
    await this.page.getByRole("button", { name: attr }).click();
    await expect(this.page.getByRole("button", { name: attr })).toHaveClass(/active/);
  }

  async collapseAll(): Promise<void> {
    await this.page.getByRole("button", { name: "全部折叠" }).click();
  }

  async expandAll(): Promise<void> {
    await this.page.getByRole("button", { name: "全部展开" }).click();
  }

  async gridScrollHeight(): Promise<number> {
    return readGridBodyScrollHeight(this.page);
  }

  async focusFirstRow(): Promise<void> {
    await this.page.locator(".vxe-body--row").first().click();
  }

  async exportCurrentView(
    query: ExportQueryPayload,
  ): Promise<Array<Record<string, unknown>>> {
    if (!this.datasetSession.datasetId) {
      throw new Error("缺少 dataset_id，请先完成真实 Excel 导入");
    }

    const response = await this.request.post(
      `/api/datasets/${this.datasetSession.datasetId}/export`,
      {
        data: {
          mode: "current_view",
          query,
        },
      },
    );

    if (!response.ok()) {
      throw new Error(`导出接口失败: ${response.status()} ${await response.text()}`);
    }

    const payload = (await response.json()) as {
      rows?: Array<Record<string, unknown>>;
    };
    return payload.rows ?? [];
  }

  async exportErrors(): Promise<Array<Record<string, unknown>>> {
    if (!this.datasetSession.datasetId) {
      throw new Error("缺少 dataset_id，请先完成真实 Excel 导入");
    }

    const response = await this.request.post(
      `/api/datasets/${this.datasetSession.datasetId}/export`,
      {
        data: { mode: "errors", query: {} },
      },
    );

    if (!response.ok()) {
      throw new Error(`错误导出接口失败: ${response.status()} ${await response.text()}`);
    }

    const payload = (await response.json()) as {
      rows?: Array<Record<string, unknown>>;
    };
    return payload.rows ?? [];
  }

  async expectCalculationAreaComplete(): Promise<void> {
    await expect(this.page.getByText("计算区域")).toBeVisible();
    await expect(this.page.getByTestId("status-current-summary")).toBeInViewport();
    await expect(this.page.getByTestId("status-focus-summary")).toBeInViewport();
    await expect(this.page.getByTestId("status-selection-summary")).toBeInViewport();
    await expect(this.page.getByTestId("status-attr-breakdown")).toBeInViewport();
  }

  async expectAnalysisAreaAccessible(): Promise<void> {
    await expect(this.page.getByTestId("node-detail-panel")).toBeVisible();
    await expect(this.page.getByTestId("anomaly-center")).toBeVisible();
    const metrics = await readWorkbenchLayoutMetrics(this.page);
    expect(metrics.nodeDetailClientHeight).toBeGreaterThanOrEqual(140);
    expect(metrics.anomalyClientHeight).toBeGreaterThanOrEqual(120);
    expect(metrics.anomalyOverflowY).toBe("auto");
  }

  async expectDesktopLayoutNotClipped(): Promise<void> {
    const metrics = await readWorkbenchLayoutMetrics(this.page);
    expect(metrics.uploadPanelHeight).toBeLessThanOrEqual(56);
    expect(metrics.errorDrawerHeight).toBeLessThanOrEqual(64);
    expect(metrics.statusBarHeight).toBeLessThanOrEqual(220);
    expect(metrics.sideOverflow).toBeLessThanOrEqual(1);
  }
}
```

- [ ] **Step 6: 创建 Playwright 扩展 fixture**

Create `frontend/e2e/fixtures/bomTest.ts`:

```ts
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
```

- [ ] **Step 7: 验证 TypeScript 编译能解析测试工具**

Run:

```powershell
cd frontend; npx playwright test --list
```

Expected: command exits `0`.

- [ ] **Step 8: Commit**

```powershell
git add frontend/e2e/fixtures/datasetSession.ts frontend/e2e/fixtures/files.ts frontend/e2e/fixtures/bomTest.ts frontend/e2e/utils/rowCount.ts frontend/e2e/utils/layoutMetrics.ts frontend/e2e/pages/BomWorkbenchPage.ts
git commit -m "test: add bom workbench e2e fixtures"
```

---

### Task 4: 用布局 E2E 锁住历史回归

**Files:**
- Create: `frontend/e2e/specs/desktop-layout.spec.ts`

- [ ] **Step 1: 写布局回归 E2E**

Create `frontend/e2e/specs/desktop-layout.spec.ts`:

```ts
import { test, expect } from "../fixtures/bomTest";
import { readWorkbenchLayoutMetrics } from "../utils/layoutMetrics";

test.describe("桌面布局完整性", () => {
  test("@layout 1600x900 下计算区和分析区完整可见", async ({
    bomWorkbench,
    page,
  }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await bomWorkbench.open();
    await bomWorkbench.importValidWorkbook();

    await bomWorkbench.expectCalculationAreaComplete();
    await bomWorkbench.expectAnalysisAreaAccessible();
    await bomWorkbench.expectDesktopLayoutNotClipped();

    await expect(page.getByTestId("status-current-row-count")).not.toHaveText("0");
  });

  test("@layout 1600x900 聚焦节点后分析区和属性分布仍完整可见", async ({
    bomWorkbench,
    page,
  }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await bomWorkbench.open();
    await bomWorkbench.importValidWorkbook();

    await bomWorkbench.focusFirstRow();

    await expect(page.getByTestId("status-focus-row-count")).not.toHaveText("0");
    await expect(page.getByTestId("status-attr-entry").first()).toBeVisible();
    await bomWorkbench.expectCalculationAreaComplete();
    await bomWorkbench.expectAnalysisAreaAccessible();
  });

  test("@layout 1366x768 下计算区和分析区可访问且不被静默裁切", async ({
    bomWorkbench,
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await bomWorkbench.open();
    await bomWorkbench.importValidWorkbook();

    await expect(page.getByText("计算区域")).toBeVisible();
    await expect(page.getByTestId("status-current-summary")).toBeVisible();
    await expect(page.getByTestId("status-focus-summary")).toBeVisible();
    await expect(page.getByTestId("status-selection-summary")).toBeVisible();
    await expect(page.getByTestId("status-attr-breakdown")).toBeVisible();
    await expect(page.getByTestId("node-detail-panel")).toBeVisible();
    await expect(page.getByTestId("anomaly-center")).toBeVisible();

    const metrics = await readWorkbenchLayoutMetrics(page);
    expect(metrics.statusBarHeight).toBeLessThanOrEqual(240);
    expect(metrics.nodeDetailClientHeight).toBeGreaterThanOrEqual(120);
    expect(metrics.anomalyClientHeight).toBeGreaterThanOrEqual(96);
    expect(metrics.anomalyOverflowY).toBe("auto");
  });
});
```

- [ ] **Step 2: 运行布局测试确认当前行为**

Run:

```powershell
cd frontend; npm run test:e2e:layout
```

Expected before layout optimization: FAIL if the current page still clips the calculation or analysis regions, most likely with a viewport or height assertion. If it unexpectedly passes, keep the test as a regression guard and still perform Task 5 to make the layout constraints explicit in CSS.

- [ ] **Step 3: Checkpoint**

If the test fails for the expected layout reason, do not commit a red branch. Keep the file in the working tree and continue to Task 5.

If the test already passes, commit the regression guard now:

```powershell
git add frontend/e2e/specs/desktop-layout.spec.ts
git commit -m "test: cover desktop layout completeness"
```

---

### Task 5: 优化前端工作台布局

**Files:**
- Modify: `frontend/src/pages/BomWorkbench.vue`
- Modify: `frontend/src/components/bom/BomGridStatusBar.vue`
- Modify: `frontend/src/components/bom/NodeDetailPanel.vue`
- Modify: `frontend/src/components/analysis/AnomalyCenter.vue`
- Modify: `frontend/src/components/common/ErrorDrawer.vue`

- [ ] **Step 1: 优化 `BomWorkbench.vue` 整体高度分配**

Replace the `<style scoped>` block in `frontend/src/pages/BomWorkbench.vue` with:

```vue
<style scoped>
.workbench {
  display: flex;
  flex-direction: column;
  height: 100vh;
  min-height: 0;
  box-sizing: border-box;
  padding: clamp(12px, 1.2vw, 20px);
  gap: var(--spacing-sm);
  background-color: var(--color-bg-container);
  overflow: hidden;
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 360px);
  gap: var(--spacing-sm);
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.side-panels {
  display: grid;
  grid-template-rows: minmax(140px, 170px) minmax(120px, 1fr);
  gap: var(--spacing-sm);
  min-height: 0;
  overflow: hidden;
}

:deep(.status-bar) {
  flex: 0 0 auto;
}

@media (max-width: 1200px) {
  .workbench {
    height: auto;
    min-height: 100vh;
    overflow: auto;
  }

  .layout {
    grid-template-columns: 1fr;
    overflow: visible;
  }

  .side-panels {
    grid-template-rows: none;
    overflow: visible;
  }
}
</style>
```

- [ ] **Step 2: 优化底部计算区高度**

In `frontend/src/components/bom/BomGridStatusBar.vue`, update the style block with these replacements:

```css
.status-bar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px var(--spacing-md);
  background:
    linear-gradient(180deg, rgba(79, 124, 172, 0.08), transparent 72%),
    var(--color-bg-elevated);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  min-height: 0;
  overflow: visible;
}
```

```css
.status-bar__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  min-height: 0;
}
```

```css
.summary-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  background-color: var(--color-bg-container);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  min-width: 0;
}
```

```css
.summary-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin: 0;
}
```

```css
.metric-item dd {
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: 600;
  line-height: 1.2;
  color: var(--color-primary);
  word-break: break-word;
}
```

Replace the `@media (max-width: 1400px)` block with:

```css
@media (max-width: 1200px) {
  .status-bar__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
```

Keep the existing `@media (max-width: 900px)` block.

- [ ] **Step 3: 优化节点详情区**

In `frontend/src/components/bom/NodeDetailPanel.vue`, replace `.node-detail-panel` style with:

```css
.node-detail-panel {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background-color: var(--color-bg-elevated);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  min-height: 140px;
  max-height: 170px;
  overflow-y: auto;
}
```

- [ ] **Step 4: 优化异常中心区**

In `frontend/src/components/analysis/AnomalyCenter.vue`, replace `.anomaly-center` style with:

```css
.anomaly-center {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background-color: var(--color-bg-elevated);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  min-height: 120px;
  overflow-y: auto;
}
```

- [ ] **Step 5: 优化错误抽屉高度**

In `frontend/src/components/common/ErrorDrawer.vue`, update `.error-drawer`:

```css
.error-drawer {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  max-height: 64px;
  padding: 10px var(--spacing-md);
  overflow-y: auto;
  background-color: #fff7e6;
  border-left: 4px solid var(--color-warning);
  border-radius: var(--radius-sm);
}
```

- [ ] **Step 6: 运行布局测试确认变绿**

Run:

```powershell
cd frontend; npm run test:e2e:layout
```

Expected: PASS.

- [ ] **Step 7: 运行相关组件测试**

Run:

```powershell
cd frontend; npm run test -- src/pages/BomWorkbench.spec.ts src/pages/BomWorkbench.flow.spec.ts src/components/bom/BomGridStatusBar.spec.ts src/components/bom/NodeDetailPanel.spec.ts src/components/analysis/AnomalyCenter.spec.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add frontend/e2e/specs/desktop-layout.spec.ts frontend/src/pages/BomWorkbench.vue frontend/src/components/bom/BomGridStatusBar.vue frontend/src/components/bom/NodeDetailPanel.vue frontend/src/components/analysis/AnomalyCenter.vue frontend/src/components/common/ErrorDrawer.vue
git commit -m "fix: keep desktop analysis and calculation regions visible"
```

---

### Task 6: Smoke、搜索筛选、树和焦点回归测试

**Files:**
- Create: `frontend/e2e/specs/smoke.spec.ts`
- Create: `frontend/e2e/specs/search-and-filter.spec.ts`
- Create: `frontend/e2e/specs/tree-and-selection.spec.ts`

- [ ] **Step 1: 创建 smoke spec**

Create `frontend/e2e/specs/smoke.spec.ts`:

```ts
import { test, expect } from "../fixtures/bomTest";

test("@smoke 上传真实 Excel 后工作台可用", async ({ bomWorkbench, page }) => {
  await bomWorkbench.open();
  await bomWorkbench.importValidWorkbook();

  await bomWorkbench.expectSummaryReady();
  await expect(page.getByTestId("status-current-row-count")).not.toHaveText("0");
  await expect(page.getByTestId("bom-grid")).toBeVisible();
});
```

- [ ] **Step 2: 创建搜索和筛选 spec**

Create `frontend/e2e/specs/search-and-filter.spec.ts`:

```ts
import { test, expect } from "../fixtures/bomTest";

test.describe("搜索和筛选回归", () => {
  test("@regression 搜索电阻后当前业务行数减少且大于 0", async ({
    bomWorkbench,
  }) => {
    await bomWorkbench.open();
    await bomWorkbench.importValidWorkbook();

    const totalRows = await bomWorkbench.currentRowCount();
    await bomWorkbench.search("电阻");

    await expect.poll(() => bomWorkbench.currentRowCount()).toBeLessThan(totalRows);
    expect(await bomWorkbench.currentRowCount()).toBeGreaterThan(0);
  });

  test("@regression 搜索命中节点时保留父级和子级上下文", async ({
    bomWorkbench,
    page,
  }) => {
    await bomWorkbench.open();
    await bomWorkbench.importValidWorkbook();

    await bomWorkbench.search("B.WW.T0019AA");

    await expect.poll(() => bomWorkbench.currentRowCount()).toBeGreaterThan(2);
    await expect(page.getByText("C.T.D0005AA")).toBeVisible();
    await expect(page.getByText("B.WW.T0019AA")).toBeVisible();
    await expect(page.getByText("B.P.C0001AA")).toBeVisible();
  });

  test("@regression 物料属性和金额下限可以组合筛选", async ({
    bomWorkbench,
  }) => {
    await bomWorkbench.open();
    await bomWorkbench.importValidWorkbook();

    const totalRows = await bomWorkbench.currentRowCount();
    await bomWorkbench.filterMaterialAttr("外购");
    await bomWorkbench.setAmountMin("1");

    await expect.poll(() => bomWorkbench.currentRowCount()).toBeLessThanOrEqual(totalRows);
    expect(await bomWorkbench.currentRowCount()).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: 创建树和焦点 spec**

Create `frontend/e2e/specs/tree-and-selection.spec.ts`:

```ts
import { test, expect } from "../fixtures/bomTest";

test.describe("树操作和焦点分析", () => {
  test("@regression 全部折叠和全部展开会改变可滚动树范围", async ({
    bomWorkbench,
  }) => {
    await bomWorkbench.open();
    await bomWorkbench.importValidWorkbook();

    await bomWorkbench.collapseAll();
    const collapsedHeight = await bomWorkbench.gridScrollHeight();

    await bomWorkbench.expandAll();
    await expect.poll(() => bomWorkbench.gridScrollHeight()).toBeGreaterThan(collapsedHeight);
    const expandedHeight = await bomWorkbench.gridScrollHeight();

    await bomWorkbench.collapseAll();
    await expect.poll(() => bomWorkbench.gridScrollHeight()).toBeLessThan(expandedHeight);
  });

  test("@regression 点击首行后焦点汇总和属性分布更新", async ({
    bomWorkbench,
    page,
  }) => {
    await bomWorkbench.open();
    await bomWorkbench.importValidWorkbook();

    await expect(page.getByTestId("status-focus-row-count")).toHaveText("0");
    await bomWorkbench.focusFirstRow();

    await expect(page.getByTestId("status-focus-row-count")).not.toHaveText("0");
    await expect(page.getByTestId("status-attr-entry").first()).toBeVisible();
  });
});
```

- [ ] **Step 4: 运行 smoke 和 regression**

Run:

```powershell
cd frontend; npm run test:e2e:smoke; npm run test:e2e:regression
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add frontend/e2e/specs/smoke.spec.ts frontend/e2e/specs/search-and-filter.spec.ts frontend/e2e/specs/tree-and-selection.spec.ts
git commit -m "test: add desktop smoke and regression e2e"
```

---

### Task 7: 导出和异常路径 E2E

**Files:**
- Create: `frontend/e2e/specs/export.spec.ts`
- Create: `frontend/e2e/specs/error-path.spec.ts`

- [ ] **Step 1: 创建导出 spec**

Create `frontend/e2e/specs/export.spec.ts`:

```ts
import { test, expect } from "../fixtures/bomTest";

test.describe("导出口径", () => {
  test("@api 当前视图导出返回关键业务字段", async ({ bomWorkbench }) => {
    await bomWorkbench.open();
    await bomWorkbench.importValidWorkbook();

    const rows = await bomWorkbench.exportCurrentView({
      search: "",
      materialAttr: "",
      sortBy: "sort_index",
      sortOrder: "asc",
    });

    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toHaveProperty("code");
    expect(rows[0]).toHaveProperty("name");
    expect(rows[0]).toHaveProperty("attr");
    expect(rows[0]).toHaveProperty("amount");
  });

  test("@api 搜索后的导出结果不超过当前视图业务行数", async ({
    bomWorkbench,
  }) => {
    await bomWorkbench.open();
    await bomWorkbench.importValidWorkbook();

    await bomWorkbench.search("电阻");
    await expect.poll(() => bomWorkbench.currentRowCount()).toBeGreaterThan(0);

    const currentRows = await bomWorkbench.currentRowCount();
    const exportedRows = await bomWorkbench.exportCurrentView({
      search: "电阻",
      materialAttr: "",
      sortBy: "sort_index",
      sortOrder: "asc",
    });

    expect(exportedRows.length).toBeGreaterThan(0);
    expect(exportedRows.length).toBeLessThanOrEqual(currentRows);
  });

  test("@api 错误导出模式返回 rows 数组", async ({ bomWorkbench }) => {
    await bomWorkbench.open();
    await bomWorkbench.importValidWorkbook();

    const rows = await bomWorkbench.exportErrors();

    expect(Array.isArray(rows)).toBe(true);
  });
});
```

- [ ] **Step 2: 创建异常路径 spec**

Create `frontend/e2e/specs/error-path.spec.ts`:

```ts
import { test, expect } from "../fixtures/bomTest";

test.describe("导入异常路径", () => {
  test("@error 非 .xlsx 文件由前端拦截且不发起导入请求", async ({
    bomWorkbench,
    page,
  }) => {
    let importRequestCount = 0;
    await page.route("**/api/import", async (route) => {
      importRequestCount += 1;
      await route.continue();
    });

    await bomWorkbench.open();
    await bomWorkbench.importClientRejectedFile();

    await expect(page.getByText("仅支持 .xlsx 格式的 Excel 文件")).toBeVisible();
    expect(importRequestCount).toBe(0);
  });

  test("@error 损坏的 .xlsx 显示 INVALID_WORKBOOK", async ({
    bomWorkbench,
    page,
  }) => {
    await bomWorkbench.open();
    await bomWorkbench.importBrokenWorkbook();

    await expect(page.getByTestId("error-drawer")).toBeVisible();
    await expect(page.getByText("INVALID_WORKBOOK")).toBeVisible();
    await expect(page.getByText("上传文件无效或已损坏，请重新导出后再试")).toBeVisible();
  });

  test("@error 后端 500 时保留已有数据上下文", async ({ bomWorkbench, page }) => {
    await bomWorkbench.open();
    await bomWorkbench.importValidWorkbook();
    const rowCountBeforeFailure = await bomWorkbench.currentRowCount();

    await page.route("**/api/import", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          detail: {
            code: "IMPORT_REQUEST_FAILED",
            message: "模拟导入失败",
            retryable: true,
          },
        }),
      });
    });

    await bomWorkbench.importValidWorkbook();

    await expect(page.getByTestId("error-drawer")).toBeVisible();
    await expect(page.getByText("模拟导入失败")).toBeVisible();
    expect(await bomWorkbench.currentRowCount()).toBe(rowCountBeforeFailure);
  });
});
```

- [ ] **Step 3: 运行 API 和异常测试**

Run:

```powershell
cd frontend; npm run test:e2e:api; npx playwright test --grep @error
```

Expected: PASS.

- [ ] **Step 4: Commit**

```powershell
git add frontend/e2e/specs/export.spec.ts frontend/e2e/specs/error-path.spec.ts
git commit -m "test: add export and import error e2e"
```

---

### Task 8: 移除旧 E2E 文件并做全量验证

**Files:**
- Delete: `frontend/e2e/bom-upload-and-filter.spec.ts`

- [ ] **Step 1: 删除旧单文件 E2E**

Delete `frontend/e2e/bom-upload-and-filter.spec.ts` after confirming its scenarios are covered by:

- `frontend/e2e/specs/smoke.spec.ts`
- `frontend/e2e/specs/search-and-filter.spec.ts`
- `frontend/e2e/specs/tree-and-selection.spec.ts`
- `frontend/e2e/specs/desktop-layout.spec.ts`

- [ ] **Step 2: 运行前端单元测试**

Run:

```powershell
cd frontend; npm run test
```

Expected: PASS.

- [ ] **Step 3: 运行前端构建**

Run:

```powershell
cd frontend; npm run build
```

Expected: PASS with Vite build success.

- [ ] **Step 4: 运行分层 E2E**

Run:

```powershell
cd frontend; npm run test:e2e:smoke; npm run test:e2e:layout; npm run test:e2e
```

Expected: PASS.

- [ ] **Step 5: 运行后端测试，确认 E2E 改造未破坏后端依赖**

Run:

```powershell
cd backend; conda run -n test pytest -q
```

Expected: PASS.

- [ ] **Step 6: 检查工作树只包含预期文件**

Run:

```powershell
git status --short
```

Expected: only planned source, test, config, fixture, and docs files are modified or added.

- [ ] **Step 7: Commit**

```powershell
git add frontend/e2e frontend/package.json frontend/playwright.config.ts frontend/src .gitignore
git commit -m "test: replace legacy e2e with layered desktop suite"
```

---

## Plan Self-Review

**Spec coverage:**

- 桌面 Chromium 单项目：Task 1.
- 单 worker 和产物治理：Task 1.
- 稳定选择器：Task 2.
- 数据集会话通过 `/api/import` 响应捕获：Task 3.
- 计算区 / 分析区显示不完全 P0 回归：Task 4 and Task 5.
- 前端布局优化：Task 5.
- Smoke、搜索、筛选、树、焦点分析：Task 6.
- 导出口径：Task 7.
- 客户端校验、坏 `.xlsx`、后端 500：Task 7.
- 禁止用虚拟滚动 DOM 行数断言业务总数：Task 3 row count helper and Task 6 tests.
- 完整验证：Task 8.

**No placeholder scan:**

The plan contains concrete file paths, code snippets, commands, and expected outcomes. It intentionally excludes Firefox, WebKit, mobile, pixel visual snapshots, and GitHub Actions.

**Type consistency:**

- `DatasetSession.datasetId` is defined in `datasetSession.ts` and used by `BomWorkbenchPage`.
- `ExportQueryPayload` uses camelCase fields matching the frontend API contract.
- `readWorkbenchLayoutMetrics()` returns all fields used by `expectDesktopLayoutNotClipped()` and `expectAnalysisAreaAccessible()`.
