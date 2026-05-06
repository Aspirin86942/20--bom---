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
