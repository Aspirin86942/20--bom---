# 生产级 Playwright E2E 测试设计

## 目标

为 BOM 本地分析工具建立分层、可维护、可在 CI 中作为质量门禁运行的 Playwright E2E 测试体系。

本设计只覆盖桌面工作场景，浏览器范围限定为 Chromium 桌面视口，不引入 Firefox、WebKit 或移动端矩阵。测试重点放在真实用户主流程、关键业务回归、异常路径、布局约束、导出口径一致性和测试产物治理。

## 输入

- 前端应用：`frontend`，Vue 3 + Vite。
- 后端应用：`backend`，FastAPI，通过 `conda run -n test` 启动。
- 真实样本文件：项目根目录 `BOM成本查询_2026041415170958.xlsx`。
- 当前 Playwright 配置：`frontend/playwright.config.ts`。
- 当前 E2E 用例：`frontend/e2e/bom-upload-and-filter.spec.ts`。
- 当前服务端口：
  - 后端：`http://127.0.0.1:8000`
  - 前端：`http://127.0.0.1:5173`

## 输出

- 生产级 Playwright 配置：桌面 Chromium 单项目、稳定超时、报告、trace、截图、失败视频和 webServer 启动配置。
- 分层 E2E 目录结构：页面对象、fixture、测试数据、业务断言工具和按场景拆分的 spec。
- 测试命令：
  - 快速 smoke
  - 完整 E2E
  - headed 调试
  - UI 调试
  - 报告查看
- `.gitignore` 中忽略 Playwright 运行产物。
- 覆盖真实 Excel 上传、搜索、筛选、展开折叠、焦点分析、异常导入、导出当前视图、桌面布局不遮挡等主场景。

## 测试范围

### 范围内

1. 真实 Excel 上传并完成导入。
2. 表格渲染和业务行数状态栏。
3. 搜索：
   - 普通关键词搜索。
   - 命中节点时保留父级和子级上下文。
4. 筛选：
   - 物料属性筛选。
   - 金额下限筛选。
   - 筛选组合后状态栏和表格保持一致。
5. 树操作：
   - 全部折叠。
   - 全部展开。
   - 展开和折叠后可见树范围变化。
6. 分析与焦点：
   - 导入后当前范围汇总可见。
   - 点击节点后焦点汇总更新。
   - 属性分布在有焦点节点后可见。
7. 导出：
   - 当前视图导出口径与当前查询快照一致。
   - 错误导出模式可返回错误明细结构。
8. 异常路径：
   - 无效文件上传显示可理解错误。
   - 后端导入接口失败时前端不进入“成功导入”状态。
9. 桌面布局：
   - 1600x900 宽屏下右侧分析区、底部状态栏、上传区、错误抽屉不互相遮挡。
   - 1366x768 常见桌面尺寸下核心操作仍可完成。
10. 测试产物：
    - 失败截图。
    - 首次重试 trace。
    - 失败视频。
    - HTML report。

### 范围外

1. Firefox、WebKit、移动端或触屏交互矩阵。
2. 像素级视觉回归测试。
3. 外部 ERP/PDM/MES 集成测试。
4. 版本 A/B 对比完整链路，除非当前页面已经具备可操作入口。
5. 性能基准测试平台。E2E 只保留少量“用户可感知”的超时约束，不做精确性能计量。

## 推荐架构

### 目录结构

```text
frontend/
  e2e/
    pages/
      BomWorkbenchPage.ts
    fixtures/
      bomTest.ts
      files.ts
    utils/
      layoutMetrics.ts
      rowCount.ts
    specs/
      smoke.spec.ts
      search-and-filter.spec.ts
      tree-and-selection.spec.ts
      export.spec.ts
      error-path.spec.ts
      desktop-layout.spec.ts
```

### 分层策略

1. `@smoke`
   - 目标：最快确认系统可用。
   - 场景：打开页面、上传真实 Excel、表格可见、状态栏非零、无阻断错误。
   - 运行频率：本地开发和 CI 默认优先运行。

2. `@regression`
   - 目标：覆盖最容易回归的业务行为。
   - 场景：搜索上下文保留、筛选组合、展开折叠、焦点分析更新。
   - 运行频率：PR 前或完整测试命令运行。

3. `@api`
   - 目标：验证前端状态与后端导出接口口径一致。
   - 场景：导入后拿到 `dataset_id`，通过当前查询快照调用导出接口，断言导出行数和字段结构。
   - 运行频率：完整测试命令运行。

4. `@error`
   - 目标：确认用户遇到坏文件或接口失败时有可理解反馈。
   - 场景：上传无效文件、模拟导入接口 400 或 500。
   - 运行频率：完整测试命令运行。

5. `@layout`
   - 目标：防止桌面工作台区域遮挡或高度挤压。
   - 场景：1600x900 和 1366x768 桌面视口下读取关键容器尺寸与滚动状态。
   - 运行频率：完整测试命令运行。

## Playwright 配置

### 浏览器项目

只保留一个项目：

```ts
{
  name: "desktop-chromium",
  use: {
    ...devices["Desktop Chrome"],
    viewport: { width: 1600, height: 900 },
  },
}
```

### 推荐配置要点

- `testDir: "./e2e/specs"`，让 helper 文件不被误识别为测试。
- `fullyParallel: true` 保留，但涉及共享后端内存数据集的用例通过独立导入避免状态污染。
- `retries: process.env.CI ? 2 : 0`。
- `workers: process.env.CI ? 1 : undefined`，CI 中降低资源竞争和端口抖动。
- `trace: "on-first-retry"`。
- `screenshot: "only-on-failure"`。
- `video: "retain-on-failure"`。
- `reporter` 本地使用 `html` + `list`，CI 可增加 `github`。
- `outputDir: "test-results"`。

## 测试数据策略

1. 真实 Excel 样本继续作为端到端主 fixture，用来覆盖真实解析链路。
2. 新增轻量无效文件 fixture，例如 `frontend/e2e/data/not-a-workbook.txt`，用于无效上传。
3. 不把 Playwright 运行中生成的 trace、截图、视频、HTML report 提交到仓库。
4. 不在 E2E 中动态修改项目根目录真实 Excel 文件。

## 页面对象与 Fixture 策略

### `BomWorkbenchPage`

页面对象负责封装稳定业务动作：

- `open()`
- `importValidWorkbook()`
- `importInvalidWorkbook()`
- `expectGridReady()`
- `currentRowCount()`
- `search(keyword)`
- `filterMaterialAttr(attr)`
- `setAmountMin(value)`
- `collapseAll()`
- `expandAll()`
- `focusFirstRow()`
- `expectSummaryReady()`
- `readLayoutMetrics()`
- `exportCurrentViewViaApi(query)`

### 为什么使用页面对象

当前 E2E 文件把上传、等待、行数解析、布局测量都写在同一个 spec 中。随着测试变全面，继续堆在单文件会导致重复等待、失败定位困难、选择器漂移。页面对象把“如何操作页面”和“断言什么业务行为”分开，后续页面 DOM 调整时可以集中维护。

## 选择器策略

优先级固定为：

1. 用户可感知语义选择器：`getByRole`、`getByLabel`、`getByText`。
2. 稳定业务测试 ID：`getByTestId`。
3. 第三方组件内部 class：只在 vxe-table 或布局尺寸无法避免时使用，并集中封装在页面对象或工具函数中。

需要避免：

- 在 spec 中散落 `.vxe-*` 内部 class。
- 用虚拟滚动 DOM 行数代表业务总行数。
- 固定 `waitForTimeout` 等待业务完成。

## 稳定等待策略

1. 上传后等待表格可见，并用状态栏业务行数 `status-current-row-count` 大于 0 作为导入完成信号。
2. 搜索和筛选后使用 `expect.poll` 等待业务行数变化。
3. 树展开折叠使用滚动高度或状态栏业务结果变化判断，不依赖短暂停顿。
4. 布局测试等待导入完成后再读取尺寸，避免初始空状态误判。
5. 接口失败测试使用 Playwright route 拦截，不依赖真实服务偶发失败。

## 首轮测试清单

1. `smoke.spec.ts`
   - `@smoke` 上传真实 Excel 后表格和汇总可用。

2. `search-and-filter.spec.ts`
   - `@regression` 搜索“电阻”后当前业务行数减少且大于 0。
   - `@regression` 搜索 `B.WW.T0019AA` 后父级、命中节点、子级上下文都可见。
   - `@regression` 物料属性筛选“外购”后按钮激活且当前业务行数有效。
   - `@regression` 搜索 + 物料属性 + 金额下限组合后仍有一致状态。

3. `tree-and-selection.spec.ts`
   - `@regression` 全部折叠和全部展开会改变树形可滚动范围。
   - `@regression` 点击首行后焦点汇总从 0 变为非 0，并出现属性分布条目。

4. `export.spec.ts`
   - `@api` 当前视图导出返回 rows 数组。
   - `@api` 搜索后导出结果不超过当前业务行数，并包含预期字段。
   - `@api` 错误导出模式返回 rows 数组。

5. `error-path.spec.ts`
   - `@error` 上传非 Excel 文件显示无效文件错误。
   - `@error` 导入接口返回 500 时页面展示失败状态，表格不应进入已导入状态。

6. `desktop-layout.spec.ts`
   - `@layout` 1600x900 下上传区、错误区、右侧分析区、底部状态栏不遮挡。
   - `@layout` 1366x768 下核心搜索、筛选、表格、状态栏仍可访问。

## 命令设计

在 `frontend/package.json` 中保留现有命令并增加分层命令：

```json
{
  "test:e2e": "playwright test",
  "test:e2e:smoke": "playwright test --grep @smoke",
  "test:e2e:regression": "playwright test --grep @regression",
  "test:e2e:headed": "playwright test --headed",
  "test:e2e:debug": "playwright test --debug",
  "test:e2e:report": "playwright show-report"
}
```

## CI 策略

当前仓库未发现 `.github` 工作流。若要加入 GitHub Actions，建议第一版只跑桌面 Chromium：

1. 安装 Node.js。
2. `cd frontend && npm ci`。
3. `npx playwright install --with-deps chromium`。
4. 准备 Python/conda `test` 环境并安装后端依赖。
5. `cd frontend && npm run test:e2e:smoke` 作为快速门禁。
6. 完整 E2E 可作为手动触发或夜间任务。

如果当前仓库只在本机使用，可以先不加 CI 文件，但仍保留 CI 兼容配置。

## 错误处理与可观测性

1. 所有失败用例必须留下 Playwright trace 或截图，便于回放定位。
2. E2E 中主动模拟的错误必须断言错误模型中的 `message` 或用户可见错误，不只断言 HTTP 状态。
3. 导入失败不能静默吞掉，页面必须有可见失败反馈。
4. 测试 helper 抛错信息使用中文，包含当前状态文本，便于本地定位。

## 风险点 / 边界条件

1. 真实 Excel 样本是 E2E 主 fixture，若文件被替换，搜索关键词和预期节点可能失效。
2. vxe-table 虚拟滚动会导致 DOM 行数小于业务行数，断言必须优先读取状态栏业务行数。
3. 后端 `dataset_store` 是内存缓存，跨测试不能复用旧 `dataset_id`；每个需要数据的测试应独立导入。
4. CI 中同时启动前后端可能受端口占用影响，webServer 应在 CI 禁止复用已有服务。
5. 页面布局测试只做结构性约束，不做截图像素比对，避免低价值噪音。
6. `waitForTimeout` 只能作为极少数第三方组件动画兜底，默认应替换成业务状态等待。

## 验收标准

1. 本地执行 `cd frontend && npm run test:e2e:smoke` 能稳定通过。
2. 本地执行 `cd frontend && npm run test:e2e` 能覆盖所有桌面 E2E 场景。
3. Playwright 失败时能在 `frontend/test-results` 或 `frontend/playwright-report` 中定位截图、trace 或视频。
4. 仓库不再提交 Playwright report 和 test-results 产物。
5. 现有前端单元测试和后端测试命令仍保持可运行，不因 E2E 改造破坏。

## 伪代码草案

```ts
// [伪代码草案]
// 目标：用分层 Playwright E2E 验证桌面端 BOM 工作台从导入到分析、筛选、导出的关键行为
// 输入：
// - validWorkbookPath: 真实 BOM Excel 样本路径
// - invalidWorkbookPath: 非 Excel 测试文件路径
// - page: Playwright 页面对象
// - request: Playwright APIRequestContext，用于验证导出等接口口径
// 输出：
// - success_result: 用例通过，并在失败时保留 trace/screenshot/video
// - error_result: 用例失败时给出明确断言信息和可回放产物

class BomWorkbenchPage {
  constructor(private page: Page, private request: APIRequestContext) {}

  async open(): Promise<void> {
    await this.page.goto("/");
    await expect(this.page.getByLabel("上传 Excel")).toBeVisible();
  }

  async importValidWorkbook(): Promise<void> {
    // 为什么每个测试独立导入：后端数据集在内存中，跨用例复用会放大状态污染风险
    await this.page.locator('input[type="file"]').setInputFiles(validWorkbookPath);
    await this.expectGridReady();
  }

  async importInvalidWorkbook(): Promise<void> {
    await this.page.locator('input[type="file"]').setInputFiles(invalidWorkbookPath);
    await this.expectImportError("上传文件无效或已损坏");
  }

  async expectGridReady(): Promise<void> {
    await expect(this.page.locator(".vxe-table")).toBeVisible();
    await expect.poll(() => this.currentRowCount()).toBeGreaterThan(0);
  }

  async currentRowCount(): Promise<number> {
    const text = await this.page.getByTestId("status-current-row-count").innerText();
    const matched = text.match(/\d+/);
    if (!matched) {
      throw new Error(`无法从状态栏解析当前视图行数: ${text}`);
    }
    return Number(matched[0]);
  }

  async search(keyword: string): Promise<void> {
    const before = await this.currentRowCount();
    await this.page.getByLabel("搜索编码/名称").fill(keyword);

    // 为什么等待业务行数：虚拟滚动 DOM 行数不能代表真实过滤结果
    await expect.poll(() => this.currentRowCount()).not.toBe(before);
  }

  async filterMaterialAttr(attr: string): Promise<void> {
    await this.page.getByRole("button", { name: attr }).click();
    await expect(this.page.getByRole("button", { name: attr })).toHaveClass(/active/);
  }

  async assertSearchKeepsContext(): Promise<void> {
    await this.search("B.WW.T0019AA");
    await expect(this.page.getByText("C.T.D0005AA")).toBeVisible();
    await expect(this.page.getByText("B.WW.T0019AA")).toBeVisible();
    await expect(this.page.getByText("B.P.C0001AA")).toBeVisible();
  }

  async exportCurrentView(query: ExportQueryPayload): Promise<Array<Record<string, unknown>>> {
    const datasetId = await this.readDatasetIdFromAppStateOrNetwork();
    const response = await this.request.post(`/api/datasets/${datasetId}/export`, {
      data: { mode: "current_view", query },
    });

    if (!response.ok()) {
      throw new Error(`导出接口失败: ${response.status()} ${await response.text()}`);
    }

    const payload = await response.json();
    return payload.rows;
  }

  async readLayoutMetrics(): Promise<LayoutMetrics> {
    return this.page.evaluate(() => {
      const sidePanels = document.querySelector(".side-panels");
      const statusBar = document.querySelector(".status-bar");
      const uploadPanel = document.querySelector(".upload-panel");
      const errorDrawer = document.querySelector(".error-drawer");

      if (
        !(sidePanels instanceof HTMLElement) ||
        !(statusBar instanceof HTMLElement) ||
        !(uploadPanel instanceof HTMLElement) ||
        !(errorDrawer instanceof HTMLElement)
      ) {
        throw new Error("布局关键容器不存在，无法读取桌面布局指标");
      }

      return {
        sideOverflow: sidePanels.scrollHeight - sidePanels.clientHeight,
        statusBarHeight: statusBar.getBoundingClientRect().height,
        uploadPanelHeight: uploadPanel.getBoundingClientRect().height,
        errorDrawerHeight: errorDrawer.getBoundingClientRect().height,
      };
    });
  }
}

test("@smoke 上传真实 Excel 后工作台可用", async ({ bomWorkbench }) => {
  await bomWorkbench.open();
  await bomWorkbench.importValidWorkbook();
  await bomWorkbench.expectGridReady();
  await bomWorkbench.expectSummaryReady();
});

test("@regression 搜索命中节点保留父子上下文", async ({ bomWorkbench }) => {
  await bomWorkbench.open();
  await bomWorkbench.importValidWorkbook();
  await bomWorkbench.assertSearchKeepsContext();
});

test("@layout 桌面宽屏下工作台关键区域不遮挡", async ({ bomWorkbench, page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await bomWorkbench.open();
  await bomWorkbench.importValidWorkbook();
  const metrics = await bomWorkbench.readLayoutMetrics();

  expect(metrics.sideOverflow).toBeLessThanOrEqual(1);
  expect(metrics.statusBarHeight).toBeLessThanOrEqual(220);
  expect(metrics.uploadPanelHeight).toBeLessThanOrEqual(56);
  expect(metrics.errorDrawerHeight).toBeLessThanOrEqual(64);
});
```
