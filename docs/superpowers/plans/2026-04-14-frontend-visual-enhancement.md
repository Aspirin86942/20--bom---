# 前端视觉增强实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 全面提升 BOM 分析工具前端视觉效果，采用现代简约风格 + 绿色主题

**Architecture:** 混合方案 - 关键区域（上传、统计卡片）使用 Element Plus 组件，其他区域通过 CSS 美化。建立设计系统（design tokens）统一视觉语言，每个组件添加 scoped 样式。

**Tech Stack:** Vue 3, TypeScript, Element Plus, CSS Variables, Vite

---

## 文件结构规划

**新建文件：**
- `frontend/src/styles/design-tokens.css` - 设计系统变量（颜色、间距、阴影等）
- `frontend/src/styles/element-override.css` - Element Plus 主题定制
- `frontend/src/styles/global.css` - 全局基础样式

**修改文件：**
- `frontend/src/main.ts` - 导入样式文件
- `frontend/src/App.vue` - 添加根容器样式
- `frontend/src/pages/BomWorkbench.vue` - 页面布局样式
- `frontend/src/components/upload/UploadPanel.vue` - 改用 el-upload 组件
- `frontend/src/components/bom/BomGridToolbar.vue` - 工具栏样式美化
- `frontend/src/components/bom/BomGrid.vue` - 表格容器样式
- `frontend/src/components/bom/BomGridStatusBar.vue` - 状态栏样式
- `frontend/src/components/analysis/AnalysisPanel.vue` - 分析面板布局样式
- `frontend/src/components/analysis/SummaryCards.vue` - 改用 el-card + el-statistic
- `frontend/src/components/analysis/AttrBreakdown.vue` - 属性分组样式
- `frontend/src/components/analysis/SelectionSummary.vue` - 选中汇总样式
- `frontend/src/components/common/ErrorDrawer.vue` - 错误抽屉样式

---

## Task 1: 建立设计系统基础

**Files:**
- Create: `frontend/src/styles/design-tokens.css`
- Create: `frontend/src/styles/element-override.css`
- Create: `frontend/src/styles/global.css`
- Modify: `frontend/src/main.ts`

- [ ] **Step 1: 创建设计 token 文件**

创建 `frontend/src/styles/design-tokens.css`：

```css
:root {
  /* 颜色系统 - 绿色主题 */
  --color-primary: #52c41a;
  --color-primary-light: #73d13d;
  --color-primary-lighter: #f6ffed;
  --color-primary-dark: #389e0d;
  --color-success: #52c41a;
  --color-warning: #faad14;
  --color-danger: #ff4d4f;
  --color-info: #1890ff;
  
  /* 中性色 */
  --color-text-primary: #262626;
  --color-text-secondary: #8c8c8c;
  --color-text-tertiary: #bfbfbf;
  --color-border: #d9d9d9;
  --color-border-light: #f0f0f0;
  --color-bg-base: #ffffff;
  --color-bg-container: #fafafa;
  --color-bg-elevated: #ffffff;
  
  /* 间距系统 */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  
  /* 圆角 */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  
  /* 阴影 */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
  
  /* 字体 */
  --font-size-sm: 12px;
  --font-size-base: 14px;
  --font-size-lg: 16px;
  --font-size-xl: 20px;
  --font-size-xxl: 24px;
}
```

- [ ] **Step 2: 创建 Element Plus 主题覆盖文件**

创建 `frontend/src/styles/element-override.css`：

```css
/* 覆盖 Element Plus 主题色为绿色 */
:root {
  --el-color-primary: #52c41a;
  --el-color-primary-light-3: #73d13d;
  --el-color-primary-light-5: #95de64;
  --el-color-primary-light-7: #b7eb8f;
  --el-color-primary-light-8: #d9f7be;
  --el-color-primary-light-9: #f6ffed;
  --el-color-primary-dark-2: #389e0d;
  
  /* 圆角统一 */
  --el-border-radius-base: 8px;
  --el-border-radius-small: 4px;
  --el-border-radius-round: 20px;
}
```

- [ ] **Step 3: 创建全局基础样式**

创建 `frontend/src/styles/global.css`：

```css
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans SC', sans-serif;
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  background-color: var(--color-bg-container);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  min-height: 100vh;
}
```

- [ ] **Step 4: 在 main.ts 中导入样式文件**

修改 `frontend/src/main.ts`，在导入 Element Plus 样式后添加自定义样式：

```typescript
import { createApp } from "vue";
import ElementPlus from "element-plus";
import VXETable from "vxe-table";

import App from "./App.vue";
import "element-plus/dist/index.css";
import "vxe-table/lib/style.css";
import "./styles/design-tokens.css";
import "./styles/element-override.css";
import "./styles/global.css";


createApp(App).use(ElementPlus).use(VXETable).mount("#app");
```

- [ ] **Step 5: 验证样式加载**

运行开发服务器：
```bash
cd frontend
npm run dev
```

打开浏览器开发者工具，检查 `:root` 元素是否包含自定义 CSS 变量（如 `--color-primary`）。

- [ ] **Step 6: 提交设计系统基础**

```bash
git add frontend/src/styles/ frontend/src/main.ts
git commit -m "feat: add design system foundation with green theme"
```

---

## Task 2: 优化页面整体布局

**Files:**
- Modify: `frontend/src/App.vue`
- Modify: `frontend/src/pages/BomWorkbench.vue`

- [ ] **Step 1: 为 App.vue 添加根容器样式**

修改 `frontend/src/App.vue`，添加 `<style>` 块：

```vue
<template>
  <BomWorkbench />
</template>

<script setup lang="ts">
import BomWorkbench from "./pages/BomWorkbench.vue";
</script>

<style>
#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
</style>
```

- [ ] **Step 2: 为 BomWorkbench 添加页面布局样式**

修改 `frontend/src/pages/BomWorkbench.vue`，添加 `<style scoped>` 块：

```vue
<style scoped>
.workbench {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: var(--spacing-lg);
  gap: var(--spacing-md);
  background-color: var(--color-bg-container);
}

.layout {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: var(--spacing-md);
  flex: 1;
  min-height: 0;
}

@media (max-width: 1200px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
</style>
```

- [ ] **Step 3: 验证布局效果**

运行 `npm run dev`，检查页面是否有合适的边距和间距。

- [ ] **Step 4: 提交布局优化**

```bash
git add frontend/src/App.vue frontend/src/pages/BomWorkbench.vue
git commit -m "feat: improve page layout with proper spacing"
```

---

## Task 4: 美化工具栏

**Files:**
- Modify: `frontend/src/components/bom/BomGridToolbar.vue`

- [ ] **Step 1: 为工具栏添加样式**

在 `frontend/src/components/bom/BomGridToolbar.vue` 末尾添加 `<style scoped>` 块：

```vue
<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background-color: var(--color-bg-elevated);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  flex-wrap: wrap;
}

label {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
}

label span {
  white-space: nowrap;
  font-weight: 500;
}

input[type="text"],
input[type="number"] {
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-base);
  transition: all 0.3s;
  min-width: 180px;
}

input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary-lighter);
}

select {
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-base);
  min-width: 120px;
  background-color: var(--color-bg-base);
  cursor: pointer;
}

select:focus {
  outline: none;
  border-color: var(--color-primary);
}

button {
  padding: var(--spacing-sm) var(--spacing-md);
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-base);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  background-color: var(--color-primary);
  color: white;
}

button:hover {
  background-color: var(--color-primary-light);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

button:active {
  transform: translateY(0);
}
</style>
```

- [ ] **Step 2: 验证工具栏样式**

运行 `npm run dev`，检查工具栏是否有：
1. 白色卡片背景和阴影
2. 输入框 focus 时的绿色边框
3. 按钮 hover 时的动画效果

- [ ] **Step 3: 提交工具栏美化**

```bash
git add frontend/src/components/bom/BomGridToolbar.vue
git commit -m "feat: enhance toolbar visual design"
```

---

## Task 3: 升级上传组件

**Files:**
- Modify: `frontend/src/components/upload/UploadPanel.vue`

- [ ] **Step 1: 改用 el-upload 组件**

完全替换 `frontend/src/components/upload/UploadPanel.vue` 的内容：

```vue
<template>
  <el-upload
    class="upload-panel"
    drag
    accept=".xlsx"
    :auto-upload="false"
    :show-file-list="false"
    :on-change="handleFileChange"
  >
    <el-icon class="upload-icon"><upload-filled /></el-icon>
    <div class="upload-text">点击或拖拽 Excel 文件到此处</div>
    <div class="upload-hint">支持 .xlsx 格式的 BOM 文件</div>
  </el-upload>
</template>

<script setup lang="ts">
import { UploadFilled } from "@element-plus/icons-vue";
import type { UploadFile } from "element-plus";


const emit = defineEmits<{ select: [file: File] }>();


function handleFileChange(uploadFile: UploadFile): void {
  if (uploadFile.raw) {
    emit("select", uploadFile.raw);
  }
}
</script>

<style scoped>
.upload-panel {
  width: 100%;
}

.upload-panel :deep(.el-upload) {
  width: 100%;
}

.upload-panel :deep(.el-upload-dragger) {
  padding: var(--spacing-xl) var(--spacing-lg);
  border-radius: var(--radius-lg);
  border: 2px dashed var(--color-border);
  background-color: var(--color-bg-elevated);
  transition: all 0.3s;
}

.upload-panel :deep(.el-upload-dragger:hover) {
  border-color: var(--color-primary);
  background-color: var(--color-primary-lighter);
}

.upload-icon {
  font-size: 48px;
  color: var(--color-text-tertiary);
  margin-bottom: var(--spacing-sm);
}

.upload-text {
  font-size: var(--font-size-lg);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-xs);
}

.upload-hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
</style>
```

- [ ] **Step 2: 验证上传功能**

运行 `npm run dev`，测试：
1. 点击上传区域能打开文件选择器
2. 拖拽文件到上传区域能触发上传
3. hover 时有视觉反馈

- [ ] **Step 3: 提交上传组件升级**

```bash
git add frontend/src/components/upload/UploadPanel.vue
git commit -m "feat: upgrade upload panel with drag-and-drop support"
```

---

# 前端视觉增强实施计划（续）

## Task 5: 优化表格区域

**Files:**
- Modify: `frontend/src/components/bom/BomGrid.vue`
- Modify: `frontend/src/components/bom/BomGridStatusBar.vue`

- [ ] **Step 1: 为 BomGrid 添加容器样式**

在 `frontend/src/components/bom/BomGrid.vue` 的 `<template>` 外层添加容器。修改模板部分：

```vue
<template>
  <div class="bom-grid-container">
    <vxe-table
      ref="gridRef"
      :data="rows"
      :row-config="{ keyField: 'id' }"
      :checkbox-config="{ highlight: true }"
      :tree-config="{ transform: true, rowField: 'id', parentField: 'parent_id' }"
      @cell-click="({ row }) => $emit('focus-row', row)"
      @checkbox-change="emitSelection"
      @checkbox-all="emitSelection"
    >
      <vxe-column type="checkbox" width="56" fixed="left" />
      <vxe-column
        field="name"
        title="物料名称"
        tree-node
        fixed="left"
        min-width="260"
      />
      <vxe-column field="code" title="物料编码" fixed="left" width="180" />
      <vxe-column field="attr" title="物料属性" width="120" />
      <vxe-column field="qty_actual" title="实际数量" width="120" />
      <vxe-column field="amount" title="金额" width="120" />
    </vxe-table>
  </div>
</template>
```

在文件末尾添加样式：

```vue
<style scoped>
.bom-grid-container {
  background-color: var(--color-bg-elevated);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.bom-grid-container :deep(.vxe-table) {
  flex: 1;
}
</style>
```

- [ ] **Step 2: 为状态栏添加样式**

在 `frontend/src/components/bom/BomGridStatusBar.vue` 末尾添加 `<style scoped>` 块：

```vue
<style scoped>
div {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-md);
  background-color: var(--color-bg-elevated);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

div > span {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

div > span::before {
  content: "•";
  color: var(--color-primary);
  font-size: var(--font-size-lg);
}
</style>
```

- [ ] **Step 3: 验证表格样式**

运行 `npm run dev`，检查：
1. 表格有白色背景和阴影
2. 状态栏有圆角和装饰点
3. 整体视觉层次清晰

- [ ] **Step 4: 提交表格区域优化**

```bash
git add frontend/src/components/bom/BomGrid.vue frontend/src/components/bom/BomGridStatusBar.vue
git commit -m "feat: enhance table area with card container"
```

---

## Task 6: 升级分析面板统计卡片

**Files:**
- Modify: `frontend/src/components/analysis/SummaryCards.vue`

- [ ] **Step 1: 改用 el-card 和 el-statistic 组件**

完全替换 `frontend/src/components/analysis/SummaryCards.vue` 的内容：

```vue
<template>
  <el-card class="summary-card" shadow="hover">
    <template #header>
      <div class="card-header">{{ title }}</div>
    </template>
    <div class="stats-grid">
      <el-statistic title="行数" :value="summary.rowCount" />
      <el-statistic title="数量合计" :value="summary.qtySum" :precision="2" />
      <el-statistic title="金额合计" :value="summary.amountSum" :precision="2" prefix="¥" />
    </div>
  </el-card>
</template>

<script setup lang="ts">
defineProps<{ title: string; summary: Record<string, unknown> }>();
</script>

<style scoped>
.summary-card {
  border-radius: var(--radius-md);
}

.card-header {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: var(--spacing-md);
}

.stats-grid :deep(.el-statistic__head) {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xs);
}

.stats-grid :deep(.el-statistic__content) {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--color-primary);
}
</style>
```

- [ ] **Step 2: 验证统计卡片效果**

运行 `npm run dev`，检查：
1. 卡片有 hover 阴影效果
2. 数字显示清晰，有绿色强调
3. 布局响应式

- [ ] **Step 3: 提交统计卡片升级**

```bash
git add frontend/src/components/analysis/SummaryCards.vue
git commit -m "feat: upgrade summary cards with el-card and el-statistic"
```

---

## Task 7: 美化分析面板其他组件

**Files:**
- Modify: `frontend/src/components/analysis/AnalysisPanel.vue`
- Modify: `frontend/src/components/analysis/AttrBreakdown.vue`
- Modify: `frontend/src/components/analysis/SelectionSummary.vue`

- [ ] **Step 1: 为 AnalysisPanel 添加样式**

在 `frontend/src/components/analysis/AnalysisPanel.vue` 末尾添加 `<style scoped>` 块：

```vue
<style scoped>
.analysis-panel {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background-color: var(--color-bg-elevated);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  height: 100%;
  overflow-y: auto;
}

.analysis-panel h2 {
  margin: 0 0 var(--spacing-md) 0;
  font-size: var(--font-size-xxl);
  font-weight: 600;
  color: var(--color-text-primary);
}

.analysis-panel label {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  background-color: var(--color-bg-container);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background-color 0.3s;
}

.analysis-panel label:hover {
  background-color: var(--color-primary-lighter);
}

.analysis-panel input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}
</style>
```

- [ ] **Step 2: 为 AttrBreakdown 添加样式**

在 `frontend/src/components/analysis/AttrBreakdown.vue` 末尾添加 `<style scoped>` 块：

```vue
<style scoped>
section {
  padding: var(--spacing-md);
  background-color: var(--color-bg-container);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-light);
}

h3 {
  margin: 0 0 var(--spacing-md) 0;
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}

div {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid var(--color-border-light);
}

div:last-child {
  border-bottom: none;
}

div span:first-child {
  color: var(--color-text-secondary);
  font-size: var(--font-size-base);
}

div span:last-child {
  color: var(--color-primary);
  font-weight: 600;
  font-size: var(--font-size-base);
}
</style>
```

- [ ] **Step 3: 为 SelectionSummary 添加样式**

在 `frontend/src/components/analysis/SelectionSummary.vue` 末尾添加 `<style scoped>` 块：

```vue
<style scoped>
section {
  padding: var(--spacing-md);
  background-color: var(--color-primary-lighter);
  border-radius: var(--radius-md);
  border-left: 4px solid var(--color-primary);
}

h3 {
  margin: 0 0 var(--spacing-md) 0;
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-primary-dark);
}

div {
  display: flex;
  justify-content: space-between;
  padding: var(--spacing-xs) 0;
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
}

div span:last-child {
  font-weight: 600;
}
</style>
```

- [ ] **Step 4: 验证分析面板样式**

运行 `npm run dev`，检查：
1. 分析面板有白色背景和阴影
2. 各个统计区块有清晰的视觉分隔
3. 选中汇总有绿色强调

- [ ] **Step 5: 提交分析面板美化**

```bash
git add frontend/src/components/analysis/
git commit -m "feat: enhance analysis panel visual design"
```

---

## Task 8: 美化错误抽屉

**Files:**
- Modify: `frontend/src/components/common/ErrorDrawer.vue`

- [ ] **Step 1: 为 ErrorDrawer 添加样式**

在 `frontend/src/components/common/ErrorDrawer.vue` 末尾添加 `<style scoped>` 块：

```vue
<style scoped>
div {
  padding: var(--spacing-md);
  background-color: #fff7e6;
  border-left: 4px solid var(--color-warning);
  border-radius: var(--radius-sm);
  margin-bottom: var(--spacing-md);
}

div:empty {
  display: none;
}

ul {
  margin: 0;
  padding-left: var(--spacing-lg);
  list-style: none;
}

li {
  padding: var(--spacing-sm) 0;
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  line-height: 1.6;
}

li::before {
  content: "⚠";
  margin-right: var(--spacing-sm);
  color: var(--color-warning);
}
</style>
```

- [ ] **Step 2: 验证错误抽屉样式**

运行 `npm run dev`，上传一个有错误的 Excel 文件，检查错误提示是否有：
1. 黄色警告背景
2. 左侧警告色边框
3. 警告图标

- [ ] **Step 3: 提交错误抽屉美化**

```bash
git add frontend/src/components/common/ErrorDrawer.vue
git commit -m "feat: enhance error drawer visual design"
```

---

## Task 9: 最终验证和调整

**Files:**
- All modified files

- [ ] **Step 1: 完整功能测试**

运行 `npm run dev`，测试完整流程：
1. 上传 Excel 文件（拖拽和点击）
2. 使用工具栏筛选和搜索
3. 展开/折叠表格
4. 点击行查看焦点统计
5. 选中多行查看选中汇总
6. 导出当前结果

- [ ] **Step 2: 响应式测试**

调整浏览器窗口大小，检查：
1. 1200px 以下时分析面板移到下方
2. 工具栏按钮自动换行
3. 表格横向滚动正常

- [ ] **Step 3: 浏览器兼容性测试**

在 Chrome、Firefox、Edge 中测试，确保样式一致。

- [ ] **Step 4: 运行前端测试**

```bash
cd frontend
npm test
```

确保所有测试通过。

- [ ] **Step 5: 最终提交**

```bash
git add .
git commit -m "feat: complete frontend visual enhancement with modern design"
```

---

## 验收标准

完成后，前端应该具备：

1. **设计系统**：统一的颜色、间距、圆角、阴影变量
2. **绿色主题**：Element Plus 和自定义组件都使用绿色作为主题色
3. **现代布局**：合理的页面边距、卡片容器、阴影层次
4. **拖拽上传**：支持点击和拖拽上传 Excel 文件
5. **精致工具栏**：输入框、按钮有 focus/hover 状态
6. **卡片化表格**：表格和状态栏有白色背景和阴影
7. **专业统计面板**：使用 el-card 和 el-statistic 展示数据
8. **视觉反馈**：按钮 hover 动画、输入框 focus 高亮
9. **响应式设计**：小屏幕下布局自动调整
10. **无功能回归**：所有原有功能正常工作

