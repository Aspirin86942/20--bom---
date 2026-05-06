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
