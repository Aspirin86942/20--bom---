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
- 明确覆盖历史回归：计算区域和分析区域显示不完全。

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
   - 客户端拦截非 `.xlsx` 文件并显示可理解错误。
   - 扩展名为 `.xlsx` 但内容无效的文件由后端返回 `INVALID_WORKBOOK`。
   - 后端导入接口失败时前端不进入“成功导入”状态。
9. 桌面布局：
   - 1600x900 宽屏下右侧分析区、底部状态栏、上传区、错误抽屉不互相遮挡。
   - 1600x900 宽屏下计算区域四个汇总块完整可见。
   - 1600x900 宽屏下节点详情和异常中心完整可访问。
   - 1366x768 常见桌面尺寸下核心操作仍可完成，计算区和分析区不能被静默裁切。
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
      datasetSession.ts
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
- `fullyParallel: true` 可以保留给未来扩展，但第一版完整 E2E 默认用单 worker 运行，避免真实 Excel 并行导入压垮本地后端。
- `retries: process.env.CI ? 2 : 0`。
- `workers: 1` 作为第一版生产默认。后续确认本机和 CI 稳定后，再考虑本地提高并发。
- `trace: "on-first-retry"`。
- `screenshot: "only-on-failure"`。
- `video: "retain-on-failure"`。
- `reporter` 本地使用 `html` + `list`，CI 可增加 `github`。
- `outputDir: "test-results"`。

## 测试数据策略

1. 真实 Excel 样本继续作为端到端主 fixture，用来覆盖真实解析链路。
2. 新增轻量客户端校验 fixture，例如 `frontend/e2e/data/not-a-workbook.txt`，用于验证非 `.xlsx` 文件不会发起导入请求。
3. 新增轻量服务端校验 fixture，例如 `frontend/e2e/data/broken-workbook.xlsx`，文件名合法但内容不是有效 Excel，用于验证后端 `INVALID_WORKBOOK` 错误。
4. 不把 Playwright 运行中生成的 trace、截图、视频、HTML report 提交到仓库。
5. 不在 E2E 中动态修改项目根目录真实 Excel 文件。

## 数据集会话契约

E2E 需要拿到导入后的 `dataset_id`，用于导出、where-used、anomalies 等 API 级断言。当前前端页面没有把 `datasetId` 暴露到 DOM，也不应为了测试读取 Vue 内部状态。

第一版统一采用网络响应捕获：

1. 上传文件前注册 `page.waitForResponse()`，匹配 `POST /api/import`。
2. 上传真实 Excel。
3. 从导入响应 JSON 读取 `dataset_id`。
4. 页面对象把 `dataset_id` 写入 `DatasetSession` fixture。
5. 后续 API 断言只使用该 session 中的 `datasetId`。

这样做的原因：`dataset_store` 是后端内存缓存，每次导入得到的数据集只在当前服务进程内有效；用网络响应捕获可以验证真实导入链路，同时避免测试依赖前端私有状态。

## 查询快照与导出契约

前端导出请求使用 camelCase 字段：

```ts
{
  search: string;
  materialAttr: string;
  amountMin?: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
}
```

后端 `QuerySnapshot` 支持 camelCase alias 和 snake_case 字段。E2E 必须至少覆盖 camelCase 入参，防止前端导出口径被后端字段命名变更破坏。

导出断言必须覆盖：

1. `current_view` 导出返回 `rows` 数组。
2. 搜索或筛选后的导出结果必须小于或等于当前视图业务行数。
3. 导出行必须包含关键业务字段：`code`、`name`、`attr`、`amount`。
4. `errors` 模式返回 `rows` 数组；如果 fixture 中存在错误，错误行需要包含可审计字段，例如 `code`、`message`、`field`、`raw_value`、`action` 中的核心字段。

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
- `readLayoutIntegrity()`
- `expectCalculationAreaComplete()`
- `expectAnalysisAreaAccessible()`

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

## 计算区 / 分析区完整性回归

项目历史上出现过计算区和分析区显示不完全的问题。该问题属于 P0 布局回归，必须进入第一版 `@layout` 测试。

### 回归表现

1. 底部“计算区域”只显示一部分，汇总卡片被父容器裁切。
2. “当前范围汇总 / 焦点节点汇总 / 框选结果汇总 / 属性分布”任一块不可见。
3. 右侧“节点详情 / 异常中心”高度被挤压到不可用。
4. 右侧分析内容存在但无法滚动查看。
5. 表格区域、计算区、分析区互相抢高度，导致其中一区被 `overflow: hidden` 静默裁切。

### 必测视口

1. `1600x900`：主工作尺寸，要求计算区四个汇总块完整可见，节点详情和异常中心可访问。
2. `1366x768`：较小桌面尺寸，允许页面或区域滚动，但不允许内容被父容器静默裁切。

### 布局完整性断言

`desktop-layout.spec.ts` 需要实现 `readLayoutIntegrity()`，至少读取以下元素：

1. `.status-bar`
2. `[data-testid="status-current-summary"]`
3. `[data-testid="status-focus-summary"]`
4. `[data-testid="status-selection-summary"]`
5. `[data-testid="status-attr-breakdown"]`
6. `.side-panels`
7. `.node-detail-panel`
8. `.anomaly-center`

断言规则：

1. `1600x900` 下，上述计算区元素必须 `toBeVisible()` 且 `toBeInViewport()`。
2. `.node-detail-panel` 高度必须大于等于 `140px`。
3. `.anomaly-center` 高度必须大于等于 `120px`。
4. `.anomaly-center` 的 `overflow-y` 必须为 `auto`，确保内容较多时可滚动。
5. `.side-panels.scrollHeight - .side-panels.clientHeight` 在 `1600x900` 下必须小于等于 `1px`。
6. `1366x768` 下如果一屏无法完整展示，必须存在可用滚动容器；禁止父容器把内容裁掉但没有滚动入口。

### 推荐检测函数

```ts
function isFullyInsideViewport(rect: DOMRect): boolean {
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= window.innerHeight &&
    rect.right <= window.innerWidth
  );
}
```

该函数只用于 1600x900 主视口的完整可见断言；1366x768 视口以“可访问、可滚动、不静默裁切”为准。

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
   - `@error` 上传 `.txt` 文件显示客户端格式错误，且不发起 `/api/import`。
   - `@error` 上传损坏的 `.xlsx` 文件显示 `INVALID_WORKBOOK`。
   - `@error` 导入接口返回 500 时页面展示失败状态，表格不应进入已导入状态。

6. `desktop-layout.spec.ts`
   - `@layout` 1600x900 下上传区、错误区、右侧分析区、底部状态栏不遮挡。
   - `@layout` 1600x900 下计算区域四个汇总块完整可见。
   - `@layout` 1600x900 下点击焦点节点后分析区和属性分布完整可见。
   - `@layout` 1366x768 下计算区和分析区可访问且不被静默裁切。

## 命令设计

在 `frontend/package.json` 中保留现有命令并增加分层命令：

```json
{
  "test:e2e": "playwright test",
  "test:e2e:smoke": "playwright test --grep @smoke",
  "test:e2e:regression": "playwright test --grep \"@smoke|@regression\"",
  "test:e2e:api": "playwright test --grep @api",
  "test:e2e:layout": "playwright test --grep @layout",
  "test:e2e:headed": "playwright test --headed",
  "test:e2e:debug": "playwright test --debug",
  "test:e2e:report": "playwright show-report"
}
```

命令边界：

1. `test:e2e:smoke` 只跑 `@smoke`。
2. `test:e2e:regression` 跑 `@smoke` 和 `@regression`。
3. `test:e2e:api` 只跑 `@api`。
4. `test:e2e:layout` 只跑 `@layout`，用于快速复查计算区和分析区显示完整性。
5. `test:e2e` 跑全部桌面 E2E。

## CI 策略

当前仓库未发现 `.github` 工作流。第一阶段不强制落 GitHub Actions，只保证 Playwright 配置 CI-compatible；第二阶段再根据实际需要补工作流。

若要加入 GitHub Actions，建议第一版只跑桌面 Chromium：

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

## 稳定选择器补充清单

为降低 E2E 脆弱度，允许在不改变业务逻辑的前提下补充最小 `data-testid`：

1. `upload-panel`
2. `upload-input`
3. `error-drawer`
4. `error-item`
5. `bom-grid`
6. `export-current-button`
7. `toolbar-search`
8. `toolbar-amount-min`

选择器补充必须服务于真实用户路径，不允许为了测试暴露业务内部状态。

## 测试产物治理

`.gitignore` 必须忽略：

```gitignore
frontend/playwright-report/
frontend/test-results/
frontend/blob-report/
```

失败产物只作为本地调试文件或 CI artifact 保留，不提交仓库。

## 风险点 / 边界条件

1. 真实 Excel 样本是 E2E 主 fixture，若文件被替换，搜索关键词和预期节点可能失效。
2. vxe-table 虚拟滚动会导致 DOM 行数小于业务行数，断言必须优先读取状态栏业务行数。
3. 后端 `dataset_store` 是内存缓存，跨测试不能复用旧 `dataset_id`；每个需要数据的测试应独立导入。
4. CI 中同时启动前后端可能受端口占用影响，webServer 应在 CI 禁止复用已有服务。
5. 页面布局测试只做结构性约束，不做截图像素比对，避免低价值噪音。
6. `waitForTimeout` 只能作为极少数第三方组件动画兜底，默认应替换成业务状态等待。
7. 计算区和分析区完整性属于 P0 回归，不能只用“容器高度小于某阈值”替代可见性断言。

## 验收标准

1. 本地执行 `cd frontend && npm run test:e2e:smoke` 能稳定通过。
2. 本地执行 `cd frontend && npm run test:e2e` 能覆盖所有桌面 E2E 场景。
3. Playwright 失败时能在 `frontend/test-results` 或 `frontend/playwright-report` 中定位截图、trace 或视频。
4. 仓库不再提交 Playwright report 和 test-results 产物。
5. 现有前端单元测试和后端测试命令仍保持可运行，不因 E2E 改造破坏。
6. `@layout` 能复现并防止“计算区 / 分析区显示不完全”的历史回归。
7. E2E spec 中禁止新增裸 `waitForTimeout`；若第三方组件动画必须使用，必须用中文注释说明原因。
8. 禁止使用 `.vxe-body--row.count()` 断言业务总行数。
9. 失败路径必须断言用户可见错误，不只断言 HTTP 状态。

## 伪代码草案

```ts
// [伪代码草案]
// 目标：用分层 Playwright E2E 验证桌面端 BOM 工作台从导入到分析、筛选、导出的关键行为
// 输入：
// - validWorkbookPath: 真实 BOM Excel 样本路径
// - invalidWorkbookPath: 非 Excel 测试文件路径
// - page: Playwright 页面对象
// - request: Playwright APIRequestContext，用于验证导出等接口口径
// - datasetSession: 当前测试通过真实导入获得的数据集会话
// 输出：
// - success_result: 用例通过，并在失败时保留 trace/screenshot/video
// - error_result: 用例失败时给出明确断言信息和可回放产物

type DatasetSession = {
  datasetId: string;
};

class BomWorkbenchPage {
  constructor(
    private page: Page,
    private request: APIRequestContext,
    private datasetSession: DatasetSession,
  ) {}

  async open(): Promise<void> {
    await this.page.goto("/");
    await expect(this.page.getByLabel("上传 Excel")).toBeVisible();
  }

  async importValidWorkbook(): Promise<void> {
    // 为什么每个测试独立导入：后端数据集在内存中，跨用例复用会放大状态污染风险
    const importResponsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes("/api/import") &&
        response.request().method() === "POST",
    );
    await this.page.locator('input[type="file"]').setInputFiles(validWorkbookPath);
    const importResponse = await importResponsePromise;
    const importPayload = await importResponse.json();
    this.datasetSession.datasetId = importPayload.dataset_id;
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
    if (!this.datasetSession.datasetId) {
      throw new Error("缺少 dataset_id，请先完成真实 Excel 导入");
    }

    const response = await this.request.post(`/api/datasets/${this.datasetSession.datasetId}/export`, {
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
      const nodeDetailPanel = document.querySelector(".node-detail-panel");
      const anomalyCenter = document.querySelector(".anomaly-center");

      if (
        !(sidePanels instanceof HTMLElement) ||
        !(statusBar instanceof HTMLElement) ||
        !(uploadPanel instanceof HTMLElement) ||
        !(errorDrawer instanceof HTMLElement) ||
        !(nodeDetailPanel instanceof HTMLElement) ||
        !(anomalyCenter instanceof HTMLElement)
      ) {
        throw new Error("布局关键容器不存在，无法读取桌面布局指标");
      }

      return {
        sideOverflow: sidePanels.scrollHeight - sidePanels.clientHeight,
        statusBarHeight: statusBar.getBoundingClientRect().height,
        uploadPanelHeight: uploadPanel.getBoundingClientRect().height,
        errorDrawerHeight: errorDrawer.getBoundingClientRect().height,
        nodeDetailClientHeight: nodeDetailPanel.clientHeight,
        anomalyClientHeight: anomalyCenter.clientHeight,
        anomalyOverflowY: getComputedStyle(anomalyCenter).overflowY,
      };
    });
  }

  async expectCalculationAreaComplete(): Promise<void> {
    await expect(this.page.getByText("计算区域")).toBeVisible();
    await expect(this.page.getByTestId("status-current-summary")).toBeInViewport();
    await expect(this.page.getByTestId("status-focus-summary")).toBeInViewport();
    await expect(this.page.getByTestId("status-selection-summary")).toBeInViewport();
    await expect(this.page.getByTestId("status-attr-breakdown")).toBeInViewport();
  }

  async expectAnalysisAreaAccessible(): Promise<void> {
    await expect(this.page.locator(".node-detail-panel")).toBeVisible();
    await expect(this.page.locator(".anomaly-center")).toBeVisible();
    const metrics = await this.readLayoutMetrics();
    expect(metrics.nodeDetailClientHeight).toBeGreaterThanOrEqual(140);
    expect(metrics.anomalyClientHeight).toBeGreaterThanOrEqual(120);
    expect(metrics.anomalyOverflowY).toBe("auto");
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
  await bomWorkbench.expectCalculationAreaComplete();
  await bomWorkbench.expectAnalysisAreaAccessible();
  const metrics = await bomWorkbench.readLayoutMetrics();

  expect(metrics.sideOverflow).toBeLessThanOrEqual(1);
  expect(metrics.statusBarHeight).toBeLessThanOrEqual(220);
  expect(metrics.uploadPanelHeight).toBeLessThanOrEqual(56);
  expect(metrics.errorDrawerHeight).toBeLessThanOrEqual(64);
});
```
