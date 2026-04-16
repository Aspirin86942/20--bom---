# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

BOM 本地分析工具：用于解析和分析 BOM（物料清单）Excel 文件的全栈应用。

**技术栈**：
- 后端：FastAPI + Python 3.10+，使用 pandas/openpyxl 处理 Excel
- 前端：Vue 3 + TypeScript + Vite，使用 Element Plus 和 vxe-table
- 环境管理：conda（后端 test 环境）+ npm（前端）

## 启动与开发

### 一键启动（推荐）

```powershell
.\run.ps1
```

自动完成：
- 检测并安装后端依赖（conda run -n test python -m pip install -e .）
- 启动后端（uvicorn，端口 8000）
- 安装前端依赖并启动 Vite 开发服务器（端口 5173）
- 等待服务就绪后自动打开浏览器

### 手动启动

**后端**：
```bash
cd backend
conda run -n test python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**前端**：
```bash
cd frontend
npm install  # 首次或依赖变更时
npx vite --host 127.0.0.1 --port 5173
```

### 测试

**后端测试**：
```bash
cd backend
conda run -n test pytest                    # 运行所有测试
conda run -n test pytest tests/services/    # 运行特定目录
conda run -n test pytest -k test_name       # 运行特定测试
```

**前端测试**：
```bash
cd frontend
npm test                                    # 运行所有测试（vitest --run）
npx vitest tests/specific.spec.ts --run    # 运行特定测试
```

## 架构设计

### 数据流

1. **导入阶段**（`/api/import`）：
   - 用户上传 Excel → `import_service.import_dataset()`
   - 工作簿验证（`workbook_validator`）：检查"子项明细" sheet 和必填列
   - 行解析（`parse_service.parse_rows_to_flat_nodes()`）：
     - 解析 BOM 层级（0, .1, ..2 等）
     - 构建父子关系（parent_id）
     - 数值字段用 `Decimal` 处理（金额、数量）
     - 错误收集：层级非法、缺少父级、数值格式错误
   - 子树聚合（`aggregate_service.build_subtree_aggregates()`）：预计算每个节点的子树统计
   - 结果存入内存缓存（`dataset_store`），返回 `dataset_id`

2. **展示阶段**（`/api/dataset/{dataset_id}`）：
   - 前端通过 `dataset_id` 获取解析后的扁平化行数据
   - `BomGrid.vue` 使用 vxe-table 的树形模式渲染（`tree-config`）
   - 右侧分析面板（`AnalysisPanel.vue`）根据焦点行或选中行展示统计

3. **导出阶段**（`/api/export/{dataset_id}`）：
   - 复用内存中的解析结果
   - 生成新 Excel（`export_service`）

### 后端模块职责

- `app/api/routes_*.py`：API 路由定义
- `app/core/dataset_store.py`：内存数据缓存（单例）
- `app/services/`：业务逻辑层
  - `import_service`：导入流程编排
  - `parse_service`：行解析和错误收集
  - `aggregate_service`：子树统计计算
  - `export_service`：导出 Excel
- `app/validators/`：数据验证（工作簿结构、必填列）
- `app/schemas/`：Pydantic 模型（请求/响应/错误）
- `app/utils/`：工具函数（如 `level_parser.parse_depth()`）

### 前端模块职责

- `src/composables/`：组合式 API（状态管理）
  - `useDataset`：导入和数据集状态
  - `useFilters`：过滤器状态（物料属性、顶层物料）
  - `useSelection`：选中行管理
  - `useAnalysis`：分析计算（焦点/选中行统计）
- `src/components/bom/`：BOM 表格组件
  - `BomGrid.vue`：树形表格（vxe-table）
  - `BomGridToolbar.vue`：工具栏（展开/折叠、过滤器）
  - `BomGridStatusBar.vue`：状态栏（行数统计）
- `src/components/analysis/`：分析面板组件
  - `AnalysisPanel.vue`：右侧分析容器
  - `SummaryCards.vue`：汇总卡片（金额、数量）
  - `AttrBreakdown.vue`：物料属性分组统计
  - `SelectionSummary.vue`：选中行汇总
- `src/api/`：HTTP 客户端（axios 封装）

## 关键约束

### 数据完整性

- **金额和数量必须用 `Decimal`**：避免浮点精度问题（`parse_service._to_decimal()`）
- **错误必须可审计**：所有解析错误记录行号、字段、原值、错误码、处理动作（`parse_service._append_error()`）
- **层级解析严格**：BOM 层级必须连续（不能跳级），缺少父级时拒绝该行

### Excel 处理

- 使用 `openpyxl`（读写）
- 读取时 `data_only=True`（获取公式计算结果）
- 所有文本操作显式指定 `encoding="utf-8"`

### 测试要求

- 后端：使用 `pytest` + `TestClient`（FastAPI）
- 前端：使用 `vitest` + `@testing-library/vue`
- 关键业务逻辑必须有单元测试（如 `parse_service`、`aggregate_service`）

### 代码风格

- Python：Type Hints 必须完整，关键逻辑有中文注释说明"为什么"
- TypeScript：接口定义在 `src/types/`，组件 props 使用 `defineProps<T>()`
- 禁止静默失败（`try/except: pass`）

## 常见任务

### 添加新的 BOM 列

1. 后端：
   - 更新 `validators/workbook_validator.py` 的 `REQUIRED_COLUMNS`（如果必填）
   - 修改 `parse_service.parse_rows_to_flat_nodes()` 解析逻辑
   - 更新 `schemas/dataset_models.py` 的响应模型
   - 添加测试用例

2. 前端：
   - 更新 `types/dataset.ts` 的类型定义
   - 在 `BomGrid.vue` 添加 `<vxe-column>`
   - 如需分析，更新 `composables/useAnalysis.ts`

### 修改聚合逻辑

- 编辑 `backend/app/services/aggregate_service.py`
- 确保 `build_subtree_aggregates()` 返回的结构与前端 `useAnalysis` 期望一致
- 运行 `conda run -n test pytest tests/services/test_import_service.py` 验证

### 调试导入错误

1. 查看后端日志（run.ps1 启动的独立窗口）
2. 检查 `parse_service` 的错误收集逻辑
3. 前端 `ErrorDrawer.vue` 会展示所有错误项（severity、message、action）

## 环境说明

- **conda 环境名称**：`test`（Python 3.10+）
- **后端端口**：8000（健康检查：`/api/health`）
- **前端端口**：5173（开发服务器）
- **前端代理**：`/api` 请求代理到 `http://127.0.0.1:8000`（见 `vite.config.ts`）

## 依赖管理

- 后端依赖在 `backend/pyproject.toml`，使用 `conda run -n test python -m pip install -e .` 安装
- 前端依赖在 `frontend/package.json`，使用 `npm install` 安装
- `run.ps1` 会自动检测依赖变更并重新安装（基于 pyproject.toml 哈希）
