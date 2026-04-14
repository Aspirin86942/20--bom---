# BOM Local Analysis Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个本地网页工具，支持重复导入固定格式 BOM Excel，并以冻结树列 + 数据区 + 分析区的方式完成结构浏览、筛选分析、数量金额汇总和导出。

**Architecture:** 后端使用 `FastAPI` 负责 Excel 导入、结构校验、层级解析、子树聚合和导出，解析结果以 `flat_rows + subtree_aggregates` 的形式缓存到内存。前端使用 `Vue 3 + vxe-table + Element Plus` 渲染树形主表、右侧分析区和导入错误展示，筛选、焦点节点和框选汇总在前端状态层完成。

**Tech Stack:** `FastAPI`, `Pydantic`, `pandas`, `openpyxl`, `decimal.Decimal`, `pytest`, `Vue 3`, `Vite`, `Element Plus`, `vxe-table`, `Vitest`, `Vue Testing Library`

---

## 文件结构与职责

### 后端

- `backend/pyproject.toml`
  定义 FastAPI、Pydantic、pandas、openpyxl、pytest 等依赖和测试入口。
- `backend/app/main.py`
  注册所有 API 路由并暴露 FastAPI 应用。
- `backend/app/core/dataset_store.py`
  维护内存级 `dataset_id -> dataset payload` 缓存。
- `backend/app/schemas/error_models.py`
  定义结构化错误与导入摘要模型。
- `backend/app/schemas/dataset_models.py`
  定义平铺节点、聚合结果和接口响应模型。
- `backend/app/validators/workbook_validator.py`
  完成文件、sheet、必填列的校验。
- `backend/app/utils/level_parser.py`
  负责把 `0 / .1 / ..2` 转换成统一层级数字。
- `backend/app/services/parse_service.py`
  把原始 Excel 行转换为 `flat_rows`，维护根上下文哨兵、父子路径和顶层归属。
- `backend/app/services/aggregate_service.py`
  预计算每个节点的数量、金额、属性分布。
- `backend/app/services/import_service.py`
  编排校验、解析、聚合，返回导入结果。
- `backend/app/services/export_service.py`
  导出当前视图、焦点子树和错误报告。
- `backend/app/api/routes_import.py`
  处理上传导入。
- `backend/app/api/routes_dataset.py`
  返回已导入数据集详情。
- `backend/app/api/routes_export.py`
  处理导出请求。
- `backend/tests/...`
  后端测试，按 validator / service / api 分目录组织。

### 前端

- `frontend/package.json`
  定义 Vue、Element Plus、vxe-table、Vitest 等依赖与脚本。
- `frontend/vite.config.ts`
  配置 Vite 与开发代理。
- `frontend/index.html`
  挂载前端应用。
- `frontend/src/main.ts`
  初始化 Vue 应用、Element Plus、vxe-table。
- `frontend/src/App.vue`
  页面入口。
- `frontend/src/types/dataset.ts`
  前端数据类型定义。
- `frontend/src/api/http.ts`
  统一封装 API 请求。
- `frontend/src/api/dataset.ts`
  封装导入、获取数据集、导出接口。
- `frontend/src/composables/useDataset.ts`
  管理导入状态、当前数据集、warning 和错误状态。
- `frontend/src/composables/useFilters.ts`
  管理搜索和筛选逻辑。
- `frontend/src/composables/useSelection.ts`
  管理焦点节点、多选和框选汇总。
- `frontend/src/composables/useAnalysis.ts`
  负责把 `rows`、`subtree_aggregates`、筛选和选择结果变成分析视图。
- `frontend/src/pages/BomWorkbench.vue`
  页面主容器，串联上传区、主表、状态条和分析区。
- `frontend/src/components/upload/UploadPanel.vue`
  上传 Excel 和显示解析状态。
- `frontend/src/components/bom/BomGrid.vue`
  主表，负责冻结树列、列组、树形展开和行事件。
- `frontend/src/components/bom/BomGridToolbar.vue`
  搜索、筛选、展开 / 折叠、导出入口。
- `frontend/src/components/bom/BomGridStatusBar.vue`
  当前视图与当前选择的数量、金额汇总。
- `frontend/src/components/analysis/AnalysisPanel.vue`
  右侧分析区总容器。
- `frontend/src/components/analysis/SummaryCards.vue`
  当前范围统计卡片。
- `frontend/src/components/analysis/SelectionSummary.vue`
  当前框选汇总卡片。
- `frontend/src/components/analysis/AttrBreakdown.vue`
  自制 / 外购 / 委外金额分布。
- `frontend/src/components/common/ErrorDrawer.vue`
  Warning / Fatal 明细面板。
- `frontend/src/**/*.spec.ts`
  前端单元测试与组件测试。

## Task 1: 初始化后端骨架

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/app/main.py`
- Create: `backend/tests/test_health.py`

- [ ] **Step 1: 写失败测试，锁定后端最小可运行入口**

```python
# backend/tests/test_health.py
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health_endpoint_returns_ok() -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **Step 2: 运行测试，确认当前没有应用入口**

Run: `conda run -n test python -m pytest backend/tests/test_health.py -v`
Expected: FAIL，错误类似 `ModuleNotFoundError: No module named 'app'`

- [ ] **Step 3: 编写最小后端实现**

```toml
# backend/pyproject.toml
[project]
name = "bom-local-analysis-backend"
version = "0.1.0"
requires-python = ">=3.10"
dependencies = [
  "fastapi>=0.116,<1.0",
  "uvicorn>=0.35,<1.0",
  "pydantic>=2.11,<3.0",
  "pandas>=2.3,<3.0",
  "openpyxl>=3.1,<4.0",
]

[project.optional-dependencies]
dev = [
  "pytest>=8.3,<9.0",
  "httpx>=0.28,<1.0",
]

[tool.pytest.ini_options]
pythonpath = ["backend"]
testpaths = ["backend/tests"]
```
```python
# backend/app/main.py
from fastapi import FastAPI


app = FastAPI(title="BOM Local Analysis Tool")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
```

- [ ] **Step 4: 再次运行测试，确认骨架通过**

Run: `conda run -n test python -m pytest backend/tests/test_health.py -v`
Expected: PASS，`test_health_endpoint_returns_ok` 通过

- [ ] **Step 5: 提交后端骨架**

```bash
git add backend/pyproject.toml backend/app/main.py backend/tests/test_health.py
git commit -m "feat: bootstrap backend api skeleton"
```

## Task 2: 完成 Excel 文件与表头校验

**Files:**
- Create: `backend/app/schemas/error_models.py`
- Create: `backend/app/validators/workbook_validator.py`
- Create: `backend/tests/validators/test_workbook_validator.py`

- [ ] **Step 1: 写失败测试，锁定缺列和缺 sheet 的错误模型**

```python
# backend/tests/validators/test_workbook_validator.py
from openpyxl import Workbook

from app.validators.workbook_validator import validate_workbook


def build_workbook(headers: list[str], sheet_name: str = "子项明细") -> Workbook:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = sheet_name
    sheet.append(headers)
    return workbook


def test_validate_workbook_reports_missing_required_columns() -> None:
    workbook = build_workbook(["BOM层级", "子项物料编码"])

    report = validate_workbook(workbook)

    assert report.status == "failed"
    assert report.summary.fatal_count == 1
    assert report.errors[0].code == "MISSING_REQUIRED_COLUMNS"


def test_validate_workbook_reports_missing_sheet() -> None:
    workbook = build_workbook(
        ["BOM层级", "子项物料编码", "物料名称", "物料属性", "实际数量", "金额"],
        sheet_name="其他Sheet",
    )

    report = validate_workbook(workbook)

    assert report.status == "failed"
    assert report.errors[0].code == "MISSING_SHEET"
```

- [ ] **Step 2: 运行测试，确认校验器尚未实现**

Run: `conda run -n test python -m pytest backend/tests/validators/test_workbook_validator.py -v`
Expected: FAIL，错误类似 `ModuleNotFoundError: No module named 'app.validators.workbook_validator'`

- [ ] **Step 3: 实现结构化错误模型与校验器**

```python
# backend/app/schemas/error_models.py
from pydantic import BaseModel, Field


class ImportErrorItem(BaseModel):
    severity: str
    code: str
    row_index: int | None = None
    field: str | None = None
    raw_value: str | None = None
    message: str
    action: str


class ImportSummary(BaseModel):
    fatal_count: int = 0
    warning_count: int = 0


class ValidationReport(BaseModel):
    status: str
    summary: ImportSummary = Field(default_factory=ImportSummary)
    errors: list[ImportErrorItem] = Field(default_factory=list)
```
```python
# backend/app/validators/workbook_validator.py
from collections.abc import Iterable

from openpyxl import Workbook

from app.schemas.error_models import ImportErrorItem, ValidationReport


REQUIRED_COLUMNS = {
    "BOM层级",
    "子项物料编码",
    "物料名称",
    "物料属性",
    "实际数量",
    "金额",
}


def _headers_from_sheet(values: Iterable[tuple[object, ...]]) -> list[str]:
    first_row = next(iter(values), ())
    return [str(cell).strip() for cell in first_row if cell is not None]


def validate_workbook(workbook: Workbook) -> ValidationReport:
    sheet_names = workbook.sheetnames
    if "子项明细" not in sheet_names:
        return ValidationReport(
            status="failed",
            summary={"fatal_count": 1, "warning_count": 0},
            errors=[
                ImportErrorItem(
                    severity="fatal",
                    code="MISSING_SHEET",
                    message="缺少子项明细 sheet",
                    action="请确认上传的是固定格式 BOM Excel",
                )
            ],
        )

    sheet = workbook["子项明细"]
    headers = _headers_from_sheet(sheet.iter_rows(min_row=1, max_row=1, values_only=True))
    missing_columns = sorted(REQUIRED_COLUMNS.difference(headers))
    if missing_columns:
        return ValidationReport(
            status="failed",
            summary={"fatal_count": 1, "warning_count": 0},
            errors=[
                ImportErrorItem(
                    severity="fatal",
                    code="MISSING_REQUIRED_COLUMNS",
                    field="表头",
                    raw_value=",".join(headers),
                    message=f"缺少必填列: {', '.join(missing_columns)}",
                    action="请补齐必填列后重新导入",
                )
            ],
        )

    return ValidationReport(status="success")
```

- [ ] **Step 4: 运行校验器测试**

Run: `conda run -n test python -m pytest backend/tests/validators/test_workbook_validator.py -v`
Expected: PASS，两个测试全部通过

- [ ] **Step 5: 提交校验器**

```bash
git add backend/app/schemas/error_models.py backend/app/validators/workbook_validator.py backend/tests/validators/test_workbook_validator.py
git commit -m "feat: add workbook validation report"
```

## Task 3: 解析 BOM 层级并生成平铺节点

**Files:**
- Create: `backend/app/utils/level_parser.py`
- Create: `backend/app/services/parse_service.py`
- Create: `backend/tests/services/test_parse_service.py`

- [ ] **Step 1: 写失败测试，锁定根哨兵、父级关系和顶层归属**

```python
# backend/tests/services/test_parse_service.py
from decimal import Decimal

from app.services.parse_service import parse_rows_to_flat_nodes


def test_parse_rows_to_flat_nodes_builds_parent_links() -> None:
    rows = [
        {"BOM层级": "0", "子项物料编码": "ROOT", "物料名称": "总成", "物料属性": "虚拟", "实际数量": 1, "金额": 0},
        {"BOM层级": ".1", "子项物料编码": "A", "物料名称": "主模块", "物料属性": "自制", "实际数量": 1, "金额": Decimal("10")},
        {"BOM层级": "..2", "子项物料编码": "B", "物料名称": "子模块", "物料属性": "外购", "实际数量": 2, "金额": Decimal("5")},
    ]

    flat_rows, errors = parse_rows_to_flat_nodes(rows)

    assert errors == []
    assert [item["code"] for item in flat_rows] == ["A", "B"]
    assert flat_rows[0]["parent_id"] == "root_2"
    assert flat_rows[1]["parent_code"] == "A"
    assert flat_rows[1]["top_level_code"] == "A"
```

- [ ] **Step 2: 运行测试，确认解析器还不存在**

Run: `conda run -n test python -m pytest backend/tests/services/test_parse_service.py -v`
Expected: FAIL，错误类似 `ModuleNotFoundError: No module named 'app.services.parse_service'`

- [ ] **Step 3: 实现层级解析和扁平化逻辑**

```python
# backend/app/utils/level_parser.py
def parse_depth(level_text: str) -> int:
    normalized = str(level_text).strip()
    if normalized == "0":
        return 0
    return normalized.count(".")
```
```python
# backend/app/services/parse_service.py
from decimal import Decimal

from app.utils.level_parser import parse_depth


def _to_decimal(value: object) -> Decimal:
    if value in (None, ""):
        return Decimal("0")
    return Decimal(str(value))


def build_root_context(raw: dict[str, object], row_index: int) -> dict[str, object]:
    return {
        "id": f"root_{row_index}",
        "code": str(raw["子项物料编码"]),
        "name": str(raw["物料名称"]),
        "level": 0,
    }


def parse_rows_to_flat_nodes(rows: list[dict[str, object]]) -> tuple[list[dict[str, object]], list[dict[str, object]]]:
    flat_rows: list[dict[str, object]] = []
    errors: list[dict[str, object]] = []
    level_stack: dict[int, dict[str, object]] = {}

    for row_index, raw in enumerate(rows, start=2):
        depth = parse_depth(str(raw["BOM层级"]))

        # 根节点只用来承接 .1，不输出到分析表
        if depth == 0:
            level_stack = {0: build_root_context(raw, row_index)}
            continue

        parent = level_stack.get(depth - 1)
        if parent is None:
            errors.append(
                {
                    "severity": "fatal",
                    "code": "MISSING_PARENT",
                    "row_index": row_index,
                    "field": "BOM层级",
                    "raw_value": str(raw["BOM层级"]),
                    "message": "当前节点缺少父级，无法建立路径",
                    "action": "请修正源 Excel 后重新导入",
                }
            )
            continue

        current = {
            "id": f"row_{row_index}",
            "parent_id": str(parent["id"]),
            "level": depth,
            "sort_index": row_index,
            "bom_level_raw": str(raw["BOM层级"]),
            "top_level_code": str(raw["子项物料编码"]) if depth == 1 else str(level_stack[1]["code"]),
            "top_level_name": str(raw["物料名称"]) if depth == 1 else str(level_stack[1]["name"]),
            "parent_code": str(parent["code"]),
            "parent_name": str(parent["name"]),
            "code": str(raw["子项物料编码"]),
            "name": str(raw["物料名称"]),
            "attr": str(raw["物料属性"]),
            "qty_actual": _to_decimal(raw["实际数量"]),
            "amount": _to_decimal(raw["金额"]),
        }
        flat_rows.append(current)
        level_stack[depth] = current
        level_stack = {k: v for k, v in level_stack.items() if k <= depth}

    return flat_rows, errors
```

- [ ] **Step 4: 运行解析测试**

Run: `conda run -n test python -m pytest backend/tests/services/test_parse_service.py -v`
Expected: PASS，父级、根哨兵和 `top_level_code` 断言通过

- [ ] **Step 5: 提交解析器**

```bash
git add backend/app/utils/level_parser.py backend/app/services/parse_service.py backend/tests/services/test_parse_service.py
git commit -m "feat: flatten bom rows into tree nodes"
```

## Task 4: 计算子树聚合并编排导入服务

**Files:**
- Create: `backend/app/services/aggregate_service.py`
- Create: `backend/app/services/import_service.py`
- Create: `backend/tests/services/test_import_service.py`

- [ ] **Step 1: 写失败测试，锁定属性金额分布和导入成功摘要**

```python
# backend/tests/services/test_import_service.py
from io import BytesIO
from decimal import Decimal

from openpyxl import Workbook

from app.services.import_service import import_dataset


def build_valid_workbook() -> BytesIO:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "子项明细"
    sheet.append(["BOM层级", "子项物料编码", "物料名称", "物料属性", "实际数量", "金额"])
    sheet.append(["0", "ROOT", "总成", "虚拟", 1, 0])
    sheet.append([".1", "A", "主模块", "自制", 1, 10])
    sheet.append(["..2", "B", "子模块", "外购", 2, 5])
    buffer = BytesIO()
    workbook.save(buffer)
    buffer.seek(0)
    return buffer


def test_import_dataset_returns_rows_and_subtree_aggregates() -> None:
    result = import_dataset(build_valid_workbook())

    assert result["status"] == "success"
    assert result["summary"]["valid_rows"] == 2
    assert result["subtree_aggregates"]["row_3"]["amount_by_attr"]["外购"] == Decimal("5")
```

- [ ] **Step 2: 运行测试，确认导入编排还不存在**

Run: `conda run -n test python -m pytest backend/tests/services/test_import_service.py -v`
Expected: FAIL，错误类似 `ModuleNotFoundError: No module named 'app.services.import_service'`

- [ ] **Step 3: 实现聚合服务和导入编排**

```python
# backend/app/services/aggregate_service.py
from decimal import Decimal


def build_subtree_aggregates(rows: list[dict[str, object]]) -> dict[str, dict[str, object]]:
    aggregates: dict[str, dict[str, object]] = {}
    children_map: dict[str, list[str]] = {}
    row_map = {str(row["id"]): row for row in rows}

    for row in rows:
        children_map.setdefault(str(row["parent_id"]), []).append(str(row["id"]))

    def walk(row_id: str) -> dict[str, object]:
        row = row_map[row_id]
        qty_sum = Decimal(str(row["qty_actual"]))
        amount_sum = Decimal(str(row["amount"]))
        amount_by_attr = {str(row["attr"]): Decimal(str(row["amount"]))}

        for child_id in children_map.get(row_id, []):
            child_agg = walk(child_id)
            qty_sum += Decimal(str(child_agg["subtree_qty_sum"]))
            amount_sum += Decimal(str(child_agg["subtree_amount_sum"]))
            for attr, attr_amount in child_agg["amount_by_attr"].items():
                amount_by_attr[attr] = amount_by_attr.get(attr, Decimal("0")) + Decimal(str(attr_amount))

        aggregates[row_id] = {
            "subtree_row_count": 1 + len(children_map.get(row_id, [])),
            "subtree_qty_sum": qty_sum,
            "subtree_amount_sum": amount_sum,
            "amount_by_attr": amount_by_attr,
        }
        return aggregates[row_id]

    for row in rows:
        if str(row["id"]) not in aggregates:
            walk(str(row["id"]))

    return aggregates
```
```python
# backend/app/services/import_service.py
from io import BytesIO

from openpyxl import load_workbook

from app.services.aggregate_service import build_subtree_aggregates
from app.services.parse_service import parse_rows_to_flat_nodes
from app.validators.workbook_validator import validate_workbook


def import_dataset(file_obj: BytesIO) -> dict[str, object]:
    workbook = load_workbook(file_obj, data_only=True)
    validation = validate_workbook(workbook)
    if validation.status == "failed":
        return {
            "status": "failed",
            "summary": validation.summary.model_dump(),
            "errors": [item.model_dump() for item in validation.errors],
        }

    sheet = workbook["子项明细"]
    headers = [str(cell.value).strip() for cell in sheet[1]]
    rows = [dict(zip(headers, values)) for values in sheet.iter_rows(min_row=2, values_only=True)]
    flat_rows, parse_errors = parse_rows_to_flat_nodes(rows)
    if parse_errors:
        return {
            "status": "failed",
            "summary": {"fatal_count": len(parse_errors), "warning_count": 0},
            "errors": parse_errors,
        }

    subtree_aggregates = build_subtree_aggregates(flat_rows)
    return {
        "status": "success",
        "summary": {"total_rows": len(rows), "valid_rows": len(flat_rows), "warning_count": 0},
        "rows": flat_rows,
        "subtree_aggregates": subtree_aggregates,
        "warnings": [],
    }
```

- [ ] **Step 4: 运行导入服务测试**

Run: `conda run -n test python -m pytest backend/tests/services/test_import_service.py -v`
Expected: PASS，导入成功且 `外购` 金额分布为 `5`

- [ ] **Step 5: 提交导入编排**

```bash
git add backend/app/services/aggregate_service.py backend/app/services/import_service.py backend/tests/services/test_import_service.py
git commit -m "feat: add bom import orchestration"
```

## Task 5: 暴露导入与数据集 API

**Files:**
- Create: `backend/app/core/dataset_store.py`
- Create: `backend/app/schemas/dataset_models.py`
- Create: `backend/app/api/routes_import.py`
- Create: `backend/app/api/routes_dataset.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/api/test_dataset_api.py`

- [ ] **Step 1: 写失败测试，锁定上传导入与获取数据集详情**

```python
# backend/tests/api/test_dataset_api.py
from io import BytesIO

from fastapi.testclient import TestClient
from openpyxl import Workbook

from app.main import app


client = TestClient(app)


def build_file_bytes() -> bytes:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "子项明细"
    sheet.append(["BOM层级", "子项物料编码", "物料名称", "物料属性", "实际数量", "金额"])
    sheet.append(["0", "ROOT", "总成", "虚拟", 1, 0])
    sheet.append([".1", "A", "主模块", "自制", 1, 10])
    buffer = BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()


def test_import_and_fetch_dataset() -> None:
    response = client.post(
        "/api/import",
        files={"file": ("bom.xlsx", build_file_bytes(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )

    dataset_id = response.json()["dataset_id"]
    detail_response = client.get(f"/api/datasets/{dataset_id}")

    assert response.status_code == 200
    assert detail_response.status_code == 200
    assert detail_response.json()["rows"][0]["code"] == "A"
```

- [ ] **Step 2: 运行 API 测试，确认路由尚未存在**

Run: `conda run -n test python -m pytest backend/tests/api/test_dataset_api.py -v`
Expected: FAIL，错误类似 `404 Not Found` 或 `ImportError`

- [ ] **Step 3: 实现数据集模型、缓存和 API 路由**

```python
# backend/app/core/dataset_store.py
class DatasetStore:
    def __init__(self) -> None:
        self._store: dict[str, dict[str, object]] = {}

    def save(self, dataset_id: str, payload: dict[str, object]) -> None:
        self._store[dataset_id] = payload

    def get(self, dataset_id: str) -> dict[str, object]:
        return self._store[dataset_id]


dataset_store = DatasetStore()
```
```python
# backend/app/schemas/dataset_models.py
from pydantic import BaseModel, Field


class ImportResponse(BaseModel):
    dataset_id: str
    status: str
    summary: dict[str, int]
    errors: list[dict[str, object]] = Field(default_factory=list)


class DatasetDetailResponse(BaseModel):
    dataset_id: str
    rows: list[dict[str, object]] = Field(default_factory=list)
    subtree_aggregates: dict[str, dict[str, object]] = Field(default_factory=dict)
    warnings: list[dict[str, object]] = Field(default_factory=list)
```
```python
# backend/app/api/routes_import.py
from io import BytesIO
from uuid import uuid4

from fastapi import APIRouter, File, UploadFile

from app.core.dataset_store import dataset_store
from app.schemas.dataset_models import ImportResponse
from app.services.import_service import import_dataset


router = APIRouter()


@router.post("/api/import", response_model=ImportResponse)
async def import_bom(file: UploadFile = File(...)) -> ImportResponse:
    result = import_dataset(BytesIO(await file.read()))
    dataset_id = f"ds_{uuid4().hex[:8]}"
    dataset_store.save(dataset_id, result)
    return ImportResponse(
        dataset_id=dataset_id,
        status=result["status"],
        summary=result["summary"],
        errors=result.get("errors", []),
    )
```
```python
# backend/app/api/routes_dataset.py
from fastapi import APIRouter

from app.core.dataset_store import dataset_store
from app.schemas.dataset_models import DatasetDetailResponse


router = APIRouter()


@router.get("/api/datasets/{dataset_id}", response_model=DatasetDetailResponse)
def get_dataset(dataset_id: str) -> DatasetDetailResponse:
    payload = dataset_store.get(dataset_id)
    return DatasetDetailResponse(
        dataset_id=dataset_id,
        rows=payload.get("rows", []),
        subtree_aggregates=payload.get("subtree_aggregates", {}),
        warnings=payload.get("warnings", []),
    )
```
```python
# backend/app/main.py
from fastapi import FastAPI

from app.api.routes_dataset import router as dataset_router
from app.api.routes_import import router as import_router


app = FastAPI(title="BOM Local Analysis Tool")
app.include_router(import_router)
app.include_router(dataset_router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
```

- [ ] **Step 4: 运行 API 测试**

Run: `conda run -n test python -m pytest backend/tests/api/test_dataset_api.py -v`
Expected: PASS，`/api/import` 返回 `dataset_id`，`/api/datasets/{id}` 返回扁平节点

- [ ] **Step 5: 提交 API**

```bash
git add backend/app/core/dataset_store.py backend/app/schemas/dataset_models.py backend/app/api/routes_import.py backend/app/api/routes_dataset.py backend/app/main.py backend/tests/api/test_dataset_api.py
git commit -m "feat: expose import and dataset apis"
```

## Task 6: 增加导出服务与导出 API

**Files:**
- Create: `backend/app/services/export_service.py`
- Create: `backend/app/api/routes_export.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/services/test_export_service.py`

- [ ] **Step 1: 写失败测试，锁定当前视图导出与错误报告导出**

```python
# backend/tests/services/test_export_service.py
from app.services.export_service import build_export_rows, build_error_report_rows


def test_build_export_rows_keeps_frontend_columns() -> None:
    rows = [{"code": "A", "name": "主模块", "attr": "自制", "qty_actual": "1", "amount": "10"}]

    export_rows = build_export_rows(rows)

    assert export_rows == [{"物料编码": "A", "物料名称": "主模块", "物料属性": "自制", "实际数量": "1", "金额": "10"}]


def test_build_error_report_rows_maps_error_fields() -> None:
    errors = [{"severity": "fatal", "code": "LEVEL_JUMP", "row_index": 12, "field": "BOM层级", "raw_value": "...3", "message": "层级跳跃", "action": "修正后重传"}]

    report_rows = build_error_report_rows(errors)

    assert report_rows[0]["错误码"] == "LEVEL_JUMP"
    assert report_rows[0]["行号"] == 12
```

- [ ] **Step 2: 运行测试，确认导出工具未实现**

Run: `conda run -n test python -m pytest backend/tests/services/test_export_service.py -v`
Expected: FAIL，错误类似 `ModuleNotFoundError: No module named 'app.services.export_service'`

- [ ] **Step 3: 实现导出服务和路由**

```python
# backend/app/services/export_service.py
def build_export_rows(rows: list[dict[str, object]]) -> list[dict[str, object]]:
    return [
        {
            "物料编码": row.get("code"),
            "物料名称": row.get("name"),
            "物料属性": row.get("attr"),
            "实际数量": str(row.get("qty_actual")),
            "金额": str(row.get("amount")),
        }
        for row in rows
    ]


def build_error_report_rows(errors: list[dict[str, object]]) -> list[dict[str, object]]:
    return [
        {
            "级别": error.get("severity"),
            "错误码": error.get("code"),
            "行号": error.get("row_index"),
            "字段": error.get("field"),
            "原值": error.get("raw_value"),
            "原因": error.get("message"),
            "处理建议": error.get("action"),
        }
        for error in errors
    ]
```
```python
# backend/app/api/routes_export.py
from fastapi import APIRouter

from app.core.dataset_store import dataset_store
from app.services.export_service import build_error_report_rows, build_export_rows


router = APIRouter()


@router.post("/api/datasets/{dataset_id}/export")
def export_dataset(dataset_id: str, mode: str = "current_view") -> dict[str, object]:
    payload = dataset_store.get(dataset_id)
    if mode == "errors":
        return {"rows": build_error_report_rows(payload.get("errors", []))}
    return {"rows": build_export_rows(payload.get("rows", []))}
```
```python
# backend/app/main.py
from fastapi import FastAPI

from app.api.routes_dataset import router as dataset_router
from app.api.routes_export import router as export_router
from app.api.routes_import import router as import_router


app = FastAPI(title="BOM Local Analysis Tool")
app.include_router(import_router)
app.include_router(dataset_router)
app.include_router(export_router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
```

- [ ] **Step 4: 运行导出测试**

Run: `conda run -n test python -m pytest backend/tests/services/test_export_service.py -v`
Expected: PASS，导出字段顺序和错误报告字段映射正确

- [ ] **Step 5: 提交导出能力**

```bash
git add backend/app/services/export_service.py backend/app/api/routes_export.py backend/app/main.py backend/tests/services/test_export_service.py
git commit -m "feat: add export service and route"
```

## Task 7: 初始化前端工程和工作台骨架

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/index.html`
- Create: `frontend/src/main.ts`
- Create: `frontend/src/App.vue`
- Create: `frontend/src/pages/BomWorkbench.vue`
- Create: `frontend/src/components/upload/UploadPanel.vue`
- Create: `frontend/src/pages/BomWorkbench.spec.ts`

- [ ] **Step 1: 写失败测试，锁定页面骨架和上传按钮**

```ts
// frontend/src/pages/BomWorkbench.spec.ts
import { render, screen } from "@testing-library/vue";

import BomWorkbench from "./BomWorkbench.vue";


test("renders upload action and analysis panel placeholder", async () => {
  render(BomWorkbench);

  expect(screen.getByRole("button", { name: "上传 Excel" })).toBeInTheDocument();
  expect(screen.getByText("分析区")).toBeInTheDocument();
});
```

- [ ] **Step 2: 运行测试，确认前端尚未初始化**

Run: `cd frontend && npm run test -- BomWorkbench.spec.ts`
Expected: FAIL，错误类似 `npm ERR! missing script: test`

- [ ] **Step 3: 编写前端最小骨架**

```json
// frontend/package.json
{
  "name": "bom-local-analysis-frontend",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "vue": "^3.5.18",
    "element-plus": "^2.10.7",
    "vxe-table": "^4.9.6"
  },
  "devDependencies": {
    "@testing-library/vue": "^8.1.0",
    "@testing-library/user-event": "^14.6.1",
    "@vitejs/plugin-vue": "^6.0.1",
    "jsdom": "^26.1.0",
    "typescript": "^5.8.3",
    "vite": "^7.1.3",
    "vitest": "^3.2.4"
  }
}
```
```ts
// frontend/vite.config.ts
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";


export default defineConfig({
  plugins: [vue()],
  test: {
    environment: "jsdom",
  },
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8000",
    },
  },
});
```
```html
<!-- frontend/index.html -->
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>BOM 本地分析工具</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```
```vue
<!-- frontend/src/components/upload/UploadPanel.vue -->
<template>
  <button type="button">上传 Excel</button>
</template>
```
```vue
<!-- frontend/src/pages/BomWorkbench.vue -->
<template>
  <section>
    <UploadPanel />
    <div>分析区</div>
  </section>
</template>

<script setup lang="ts">
import UploadPanel from "../components/upload/UploadPanel.vue";
</script>
```
```vue
<!-- frontend/src/App.vue -->
<template>
  <BomWorkbench />
</template>

<script setup lang="ts">
import BomWorkbench from "./pages/BomWorkbench.vue";
</script>
```
```ts
// frontend/src/main.ts
import { createApp } from "vue";
import App from "./App.vue";


createApp(App).mount("#app");
```

- [ ] **Step 4: 运行前端骨架测试**

Run: `cd frontend && npm install && npm run test -- BomWorkbench.spec.ts`
Expected: PASS，页面出现上传按钮和分析区占位

- [ ] **Step 5: 提交前端骨架**

```bash
git add frontend/package.json frontend/vite.config.ts frontend/index.html frontend/src/main.ts frontend/src/App.vue frontend/src/pages/BomWorkbench.vue frontend/src/components/upload/UploadPanel.vue frontend/src/pages/BomWorkbench.spec.ts
git commit -m "feat: bootstrap frontend workbench shell"
```

## Task 8: 接入数据类型、API 客户端和导入状态管理

**Files:**
- Create: `frontend/src/types/dataset.ts`
- Create: `frontend/src/api/http.ts`
- Create: `frontend/src/api/dataset.ts`
- Create: `frontend/src/composables/useDataset.ts`
- Create: `frontend/src/components/common/ErrorDrawer.vue`
- Create: `frontend/src/composables/useDataset.spec.ts`

- [ ] **Step 1: 写失败测试，锁定导入成功后状态更新**

```ts
// frontend/src/composables/useDataset.spec.ts
import { vi } from "vitest";

import { useDataset } from "./useDataset";


vi.mock("../api/dataset", () => ({
  importDataset: vi.fn().mockResolvedValue({ dataset_id: "ds_001", status: "success", summary: { total_rows: 3, valid_rows: 2, warning_count: 1 }, errors: [] }),
  fetchDataset: vi.fn().mockResolvedValue({ dataset_id: "ds_001", rows: [{ id: "row_3", code: "A" }], subtree_aggregates: {}, warnings: [{ code: "AMOUNT_EMPTY" }] }),
}));


test("loads dataset after successful import", async () => {
  const { state, importFile } = useDataset();
  const file = new File(["demo"], "bom.xlsx");

  await importFile(file);

  expect(state.datasetId).toBe("ds_001");
  expect(state.rows).toHaveLength(1);
  expect(state.warnings).toHaveLength(1);
});
```

- [ ] **Step 2: 运行测试，确认 composable 尚未存在**

Run: `cd frontend && npm run test -- src/composables/useDataset.spec.ts`
Expected: FAIL，错误类似 `Cannot find module './useDataset'`

- [ ] **Step 3: 实现前端类型、API 和导入状态**

```ts
// frontend/src/types/dataset.ts
export interface FlatRow {
  id: string;
  parent_id: string;
  level: number;
  code: string;
  name: string;
  attr: string;
  qty_actual: string;
  amount: string;
}

export interface DatasetState {
  datasetId: string;
  rows: FlatRow[];
  subtreeAggregates: Record<string, Record<string, unknown>>;
  errors: Array<Record<string, unknown>>;
  warnings: Array<Record<string, unknown>>;
  loading: boolean;
}
```
```ts
// frontend/src/api/http.ts
export async function requestJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}
```
```ts
// frontend/src/api/dataset.ts
import { requestJson } from "./http";


export function importDataset(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return requestJson<{ dataset_id: string; status: string; summary: Record<string, number>; errors: Array<Record<string, unknown>> }>("/api/import", {
    method: "POST",
    body: formData,
  });
}


export function fetchDataset(datasetId: string) {
  return requestJson<{ dataset_id: string; rows: unknown[]; subtree_aggregates: Record<string, unknown>; warnings: unknown[] }>(
    `/api/datasets/${datasetId}`,
  );
}
```
```ts
// frontend/src/composables/useDataset.ts
import { reactive } from "vue";

import { fetchDataset, importDataset } from "../api/dataset";
import type { DatasetState } from "../types/dataset";


export function useDataset() {
  const state = reactive<DatasetState>({
    datasetId: "",
    rows: [],
    subtreeAggregates: {},
    errors: [],
    warnings: [],
    loading: false,
  });

  async function importFile(file: File): Promise<void> {
    state.loading = true;
    const importResult = await importDataset(file);
    state.errors = importResult.errors;
    if (importResult.status !== "success") {
      state.loading = false;
      return;
    }
    const detail = await fetchDataset(importResult.dataset_id);
    state.datasetId = detail.dataset_id;
    state.rows = detail.rows as DatasetState["rows"];
    state.subtreeAggregates = detail.subtree_aggregates;
    state.warnings = detail.warnings as DatasetState["warnings"];
    state.loading = false;
  }

  return { state, importFile };
}
```
```vue
<!-- frontend/src/components/common/ErrorDrawer.vue -->
<template>
  <aside v-if="errors.length">
    <h3>导入提示</h3>
    <ul>
      <li v-for="item in errors" :key="String(item.code)">
        {{ item.code }} - {{ item.message }}
      </li>
    </ul>
  </aside>
</template>

<script setup lang="ts">
defineProps<{ errors: Array<Record<string, unknown>> }>();
</script>
```

- [ ] **Step 4: 运行导入状态测试**

Run: `cd frontend && npm run test -- src/composables/useDataset.spec.ts`
Expected: PASS，`datasetId`、`rows` 和 `warnings` 被正确写入状态

- [ ] **Step 5: 提交导入状态管理**

```bash
git add frontend/src/types/dataset.ts frontend/src/api/http.ts frontend/src/api/dataset.ts frontend/src/composables/useDataset.ts frontend/src/components/common/ErrorDrawer.vue frontend/src/composables/useDataset.spec.ts
git commit -m "feat: add frontend dataset loading state"
```

## Task 9: 实现筛选逻辑、树形主表和状态条

**Files:**
- Create: `frontend/src/composables/useFilters.ts`
- Create: `frontend/src/components/bom/BomGridToolbar.vue`
- Create: `frontend/src/components/bom/BomGrid.vue`
- Create: `frontend/src/components/bom/BomGridStatusBar.vue`
- Create: `frontend/src/composables/useFilters.spec.ts`

- [ ] **Step 1: 写失败测试，锁定搜索、属性筛选和金额筛选**

```ts
// frontend/src/composables/useFilters.spec.ts
import { ref } from "vue";

import { useFilters } from "./useFilters";


test("filters rows by search, attr and amount", () => {
  const rows = [
    { code: "A", name: "主模块", attr: "自制", level: 1, amount: "10" },
    { code: "B", name: "子模块", attr: "外购", level: 2, amount: "5" },
  ];
  const { filters, filteredRows } = useFilters(ref(rows as never[]));

  filters.search = "子模";
  filters.attrs = ["外购"];
  filters.amountMin = "4";

  expect(filteredRows.value).toHaveLength(1);
  expect(filteredRows.value[0].code).toBe("B");
});
```

- [ ] **Step 2: 运行测试，确认筛选 composable 不存在**

Run: `cd frontend && npm run test -- src/composables/useFilters.spec.ts`
Expected: FAIL，错误类似 `Cannot find module './useFilters'`

- [ ] **Step 3: 实现筛选逻辑与主表组件**

```ts
// frontend/src/composables/useFilters.ts
import { computed, reactive, type Ref } from "vue";


export function useFilters(rows: Ref<Array<Record<string, unknown>>>) {
  const filters = reactive({
    search: "",
    attrs: [] as string[],
    amountMin: "",
  });

  const filteredRows = computed(() =>
    rows.value.filter((row) => {
      const matchesSearch =
        !filters.search ||
        String(row.code).includes(filters.search) ||
        String(row.name).includes(filters.search);
      const matchesAttr =
        filters.attrs.length === 0 || filters.attrs.includes(String(row.attr));
      const matchesAmount =
        !filters.amountMin || Number(row.amount) >= Number(filters.amountMin);
      return matchesSearch && matchesAttr && matchesAmount;
    }),
  );

  return { filters, filteredRows };
}
```
```vue
<!-- frontend/src/components/bom/BomGridToolbar.vue -->
<template>
  <div class="toolbar">
    <input :value="search" placeholder="搜索编码/名称" @input="$emit('update:search', ($event.target as HTMLInputElement).value)" />
    <button type="button" @click="$emit('expand-all')">全部展开</button>
    <button type="button" @click="$emit('collapse-all')">全部折叠</button>
    <button type="button" @click="$emit('export-current')">导出当前结果</button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ search: string }>();
defineEmits<{
  "update:search": [value: string];
  "expand-all": [];
  "collapse-all": [];
  "export-current": [];
}>();
</script>
```
```vue
<!-- frontend/src/components/bom/BomGrid.vue -->
<template>
  <vxe-table
    ref="gridRef"
    :data="rows"
    row-id="id"
    :checkbox-config="{ highlight: true }"
    :tree-config="{ transform: true, rowField: 'id', parentField: 'parent_id' }"
    @cell-click="({ row }) => $emit('focus-row', row)"
    @checkbox-change="emitSelection"
    @checkbox-all="emitSelection"
  >
    <vxe-column type="checkbox" width="56" fixed="left" />
    <vxe-column field="name" title="物料名称" tree-node fixed="left" min-width="260" />
    <vxe-column field="code" title="物料编码" fixed="left" width="180" />
    <vxe-column field="attr" title="物料属性" width="120" />
    <vxe-column field="qty_actual" title="实际数量" width="120" />
    <vxe-column field="amount" title="金额" width="120" />
  </vxe-table>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";


const props = defineProps<{ rows: Array<Record<string, unknown>>; expandAll?: boolean }>();
const emit = defineEmits<{
  "focus-row": [row: Record<string, unknown>];
  "selection-change": [rows: Array<Record<string, unknown>>];
}>();
const gridRef = ref();


watch(
  () => props.expandAll,
  (value) => {
    if (value === undefined || !gridRef.value) {
      return;
    }
    gridRef.value.setAllTreeExpand(value);
  },
);


function emitSelection(): void {
  emit("selection-change", gridRef.value?.getCheckboxRecords() ?? []);
}
</script>
```
```vue
<!-- frontend/src/components/bom/BomGridStatusBar.vue -->
<template>
  <footer class="status-bar">
    <span>当前视图：{{ rowCount }} 行</span>
    <span>数量合计：{{ qtySum }}</span>
    <span>金额合计：{{ amountSum }}</span>
  </footer>
</template>

<script setup lang="ts">
defineProps<{ rowCount: number; qtySum: string; amountSum: string }>();
</script>
```

- [ ] **Step 4: 运行筛选测试**

Run: `cd frontend && npm run test -- src/composables/useFilters.spec.ts`
Expected: PASS，搜索 + 属性 + 金额三个条件生效

- [ ] **Step 5: 提交主表与筛选**

```bash
git add frontend/src/composables/useFilters.ts frontend/src/components/bom/BomGridToolbar.vue frontend/src/components/bom/BomGrid.vue frontend/src/components/bom/BomGridStatusBar.vue frontend/src/composables/useFilters.spec.ts
git commit -m "feat: add grid filters and pinned tree columns"
```

## Task 10: 实现焦点节点、框选汇总和右侧分析区

**Files:**
- Create: `frontend/src/composables/useSelection.ts`
- Create: `frontend/src/composables/useAnalysis.ts`
- Create: `frontend/src/components/analysis/AnalysisPanel.vue`
- Create: `frontend/src/components/analysis/SummaryCards.vue`
- Create: `frontend/src/components/analysis/SelectionSummary.vue`
- Create: `frontend/src/components/analysis/AttrBreakdown.vue`
- Create: `frontend/src/composables/useAnalysis.spec.ts`

- [ ] **Step 1: 写失败测试，锁定“当前可见行”和“包含折叠子项”两种口径**

```ts
// frontend/src/composables/useAnalysis.spec.ts
import { ref } from "vue";

import { useAnalysis } from "./useAnalysis";


test("summarizes visible rows and focus subtree separately", () => {
  const rows = ref([
    { id: "row_3", parent_id: "root_2", level: 1, code: "A", attr: "自制", qty_actual: "1", amount: "10" },
  ]);
  const subtreeAggregates = ref({
    row_3: {
      subtree_qty_sum: "3",
      subtree_amount_sum: "15",
      amount_by_attr: { 自制: "10", 外购: "5" },
    },
  });
  const includeCollapsedDescendants = ref(false);

  const { currentSummary, focusSummary } = useAnalysis(rows, subtreeAggregates, ref(rows.value[0]), includeCollapsedDescendants);

  expect(currentSummary.value.amountSum).toBe("10.00");
  expect(focusSummary.value.amountSum).toBe("10.00");

  includeCollapsedDescendants.value = true;

  expect(focusSummary.value.amountSum).toBe("15.00");
});
```

- [ ] **Step 2: 运行测试，确认分析 composable 尚未实现**

Run: `cd frontend && npm run test -- src/composables/useAnalysis.spec.ts`
Expected: FAIL，错误类似 `Cannot find module './useAnalysis'`

- [ ] **Step 3: 实现选择与分析逻辑、右侧分析组件**

```ts
// frontend/src/composables/useSelection.ts
import { computed, ref } from "vue";


export function useSelection() {
  const focusRow = ref<Record<string, unknown> | null>(null);
  const selectedRows = ref<Array<Record<string, unknown>>>([]);

  const selectionSummary = computed(() => {
    const qtySum = selectedRows.value.reduce((sum, row) => sum + Number(row.qty_actual ?? 0), 0);
    const amountSum = selectedRows.value.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    return {
      rowCount: selectedRows.value.length,
      qtySum: qtySum.toFixed(2),
      amountSum: amountSum.toFixed(2),
    };
  });

  return { focusRow, selectedRows, selectionSummary };
}
```
```ts
// frontend/src/composables/useAnalysis.ts
import { computed, type Ref } from "vue";


function summarizeRows(rows: Array<Record<string, unknown>>) {
  const qtySum = rows.reduce((sum, row) => sum + Number(row.qty_actual ?? 0), 0);
  const amountSum = rows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  return { rowCount: rows.length, qtySum: qtySum.toFixed(2), amountSum: amountSum.toFixed(2) };
}


function sliceVisibleSubtree(
  rows: Array<Record<string, unknown>>,
  focusId: string,
) {
  const startIndex = rows.findIndex((row) => String(row.id) == focusId);
  if (startIndex === -1) {
    return [];
  }

  const focusLevel = Number(rows[startIndex].level ?? 0);
  const result = [rows[startIndex]];
  for (let index = startIndex + 1; index < rows.length; index += 1) {
    const currentLevel = Number(rows[index].level ?? 0);
    if (currentLevel <= focusLevel) {
      break;
    }
    result.push(rows[index]);
  }
  return result;
}


export function useAnalysis(
  visibleRows: Ref<Array<Record<string, unknown>>>,
  subtreeAggregates: Ref<Record<string, Record<string, unknown>>>,
  focusRow: Ref<Record<string, unknown> | null>,
  includeCollapsedDescendants: Ref<boolean>,
) {
  const currentSummary = computed(() => summarizeRows(visibleRows.value));

  const focusSummary = computed(() => {
    if (!focusRow.value) {
      return currentSummary.value;
    }
    if (!includeCollapsedDescendants.value) {
      return summarizeRows(sliceVisibleSubtree(visibleRows.value, String(focusRow.value.id)));
    }
    const aggregate = subtreeAggregates.value[String(focusRow.value.id)];
    return {
      rowCount: Number(aggregate?.subtree_row_count ?? 1),
      qtySum: Number(aggregate?.subtree_qty_sum ?? focusRow.value.qty_actual ?? "0").toFixed(2),
      amountSum: Number(aggregate?.subtree_amount_sum ?? focusRow.value.amount ?? "0").toFixed(2),
    };
  });

  return { currentSummary, focusSummary };
}
```
```vue
<!-- frontend/src/components/analysis/AnalysisPanel.vue -->
<template>
  <aside class="analysis-panel">
    <h2>分析区</h2>
    <SummaryCards :summary="currentSummary" title="当前范围汇总" />
    <SummaryCards :summary="focusSummary" title="焦点节点汇总" />
    <SelectionSummary :summary="selectionSummary" />
    <AttrBreakdown :breakdown="amountByAttr" />
  </aside>
</template>

<script setup lang="ts">
import AttrBreakdown from "./AttrBreakdown.vue";
import SelectionSummary from "./SelectionSummary.vue";
import SummaryCards from "./SummaryCards.vue";


defineProps<{
  currentSummary: Record<string, unknown>;
  focusSummary: Record<string, unknown>;
  selectionSummary: Record<string, unknown>;
  amountByAttr: Record<string, unknown>;
}>();
</script>
```
```vue
<!-- frontend/src/components/analysis/SummaryCards.vue -->
<template>
  <section>
    <h3>{{ title }}</h3>
    <div>行数：{{ summary.rowCount }}</div>
    <div>数量合计：{{ summary.qtySum }}</div>
    <div>金额合计：{{ summary.amountSum }}</div>
  </section>
</template>

<script setup lang="ts">
defineProps<{ title: string; summary: Record<string, unknown> }>();
</script>
```
```vue
<!-- frontend/src/components/analysis/SelectionSummary.vue -->
<template>
  <section>
    <h3>框选结果汇总</h3>
    <div>行数：{{ summary.rowCount }}</div>
    <div>数量合计：{{ summary.qtySum }}</div>
    <div>金额合计：{{ summary.amountSum }}</div>
  </section>
</template>

<script setup lang="ts">
defineProps<{ summary: Record<string, unknown> }>();
</script>
```
```vue
<!-- frontend/src/components/analysis/AttrBreakdown.vue -->
<template>
  <section>
    <h3>属性分布</h3>
    <div v-for="(value, key) in breakdown" :key="String(key)">
      {{ key }}：{{ value }}
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{ breakdown: Record<string, unknown> }>();
</script>
```

- [ ] **Step 4: 运行分析测试**

Run: `cd frontend && npm run test -- src/composables/useAnalysis.spec.ts`
Expected: PASS，默认当前范围统计为可见行，切换口径时焦点子树取预聚合值

- [ ] **Step 5: 提交分析区**

```bash
git add frontend/src/composables/useSelection.ts frontend/src/composables/useAnalysis.ts frontend/src/components/analysis/AnalysisPanel.vue frontend/src/components/analysis/SummaryCards.vue frontend/src/components/analysis/SelectionSummary.vue frontend/src/components/analysis/AttrBreakdown.vue frontend/src/composables/useAnalysis.spec.ts
git commit -m "feat: add focus and selection analysis"
```

## Task 11: 串联工作台页面并完成导出、warning 展示

**Files:**
- Modify: `frontend/src/pages/BomWorkbench.vue`
- Modify: `frontend/src/components/upload/UploadPanel.vue`
- Modify: `frontend/src/api/dataset.ts`
- Modify: `frontend/src/pages/BomWorkbench.spec.ts`
- Create: `frontend/src/pages/BomWorkbench.flow.spec.ts`

- [ ] **Step 1: 写失败测试，锁定导入后主表、状态条和 warning 提示联动**

```ts
// frontend/src/pages/BomWorkbench.flow.spec.ts
import { render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import BomWorkbench from "./BomWorkbench.vue";


vi.mock("../api/dataset", () => ({
  importDataset: vi.fn().mockResolvedValue({ dataset_id: "ds_001", status: "success", summary: { total_rows: 3, valid_rows: 2, warning_count: 1 }, errors: [] }),
  fetchDataset: vi.fn().mockResolvedValue({
    dataset_id: "ds_001",
    rows: [{ id: "row_3", parent_id: "root_2", code: "A", name: "主模块", attr: "自制", qty_actual: "1", amount: "10" }],
    subtree_aggregates: {},
    warnings: [{ code: "AMOUNT_EMPTY", message: "金额为空" }],
  }),
}));


test("loads rows and keeps warning panel visible after import", async () => {
  render(BomWorkbench);
  const input = screen.getByLabelText("上传 Excel");

  await userEvent.upload(input, new File(["demo"], "bom.xlsx"));

  expect(await screen.findByText("主模块")).toBeInTheDocument();
  expect(screen.getByText("导入提示")).toBeInTheDocument();
});
```

- [ ] **Step 2: 运行联动测试，确认页面还未串联**

Run: `cd frontend && npm run test -- src/pages/BomWorkbench.flow.spec.ts`
Expected: FAIL，错误类似找不到上传 input 或页面未显示数据

- [ ] **Step 3: 完成工作台页面串联**

```vue
<!-- frontend/src/components/upload/UploadPanel.vue -->
<template>
  <div>
    <button type="button" @click="fileInput?.click()">上传 Excel</button>
    <input ref="fileInput" aria-label="上传 Excel" type="file" accept=".xlsx" @change="handleFileChange" />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const emit = defineEmits<{ select: [file: File] }>();
const fileInput = ref<HTMLInputElement | null>(null);


function handleFileChange(event: Event): void {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) {
    emit("select", file);
  }
}
</script>
```
```ts
// frontend/src/api/dataset.ts
import { requestJson } from "./http";


export function importDataset(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return requestJson<{ dataset_id: string; status: string; summary: Record<string, number>; errors: Array<Record<string, unknown>> }>("/api/import", {
    method: "POST",
    body: formData,
  });
}


export function fetchDataset(datasetId: string) {
  return requestJson<{ dataset_id: string; rows: Array<Record<string, unknown>>; subtree_aggregates: Record<string, Record<string, unknown>>; warnings: Array<Record<string, unknown>> }>(
    `/api/datasets/${datasetId}`,
  );
}


export function exportDataset(datasetId: string, mode = "current_view") {
  return requestJson<{ rows: Array<Record<string, unknown>> }>(`/api/datasets/${datasetId}/export?mode=${mode}`, {
    method: "POST",
  });
}
```
```vue
<!-- frontend/src/pages/BomWorkbench.vue -->
<template>
  <section class="workbench">
    <UploadPanel @select="importFile" />
    <ErrorDrawer :errors="state.errors.length ? state.errors : state.warnings" />
    <BomGridToolbar
      :search="filters.search"
      @update:search="filters.search = $event"
      @export-current="handleExport"
      @expand-all="expanded = true"
      @collapse-all="expanded = false"
    />
    <div class="layout">
      <BomGrid
        :rows="filteredRows"
        :expand-all="expanded"
        @focus-row="focusRow = $event"
        @selection-change="selectedRows = $event"
      />
      <AnalysisPanel
        :current-summary="currentSummary"
        :focus-summary="focusSummary"
        :selection-summary="selectionSummary"
        :amount-by-attr="focusRow ? state.subtreeAggregates[String(focusRow.id)]?.amount_by_attr ?? {} : {}"
      />
    </div>
    <BomGridStatusBar
      :row-count="currentSummary.rowCount"
      :qty-sum="currentSummary.qtySum"
      :amount-sum="currentSummary.amountSum"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

import { exportDataset } from "../api/dataset";
import AnalysisPanel from "../components/analysis/AnalysisPanel.vue";
import BomGrid from "../components/bom/BomGrid.vue";
import BomGridStatusBar from "../components/bom/BomGridStatusBar.vue";
import BomGridToolbar from "../components/bom/BomGridToolbar.vue";
import ErrorDrawer from "../components/common/ErrorDrawer.vue";
import UploadPanel from "../components/upload/UploadPanel.vue";
import { useAnalysis } from "../composables/useAnalysis";
import { useDataset } from "../composables/useDataset";
import { useFilters } from "../composables/useFilters";
import { useSelection } from "../composables/useSelection";


const { state, importFile } = useDataset();
const rowsRef = computed(() => state.rows as Array<Record<string, unknown>>);
const aggregatesRef = computed(() => state.subtreeAggregates);
const { filters, filteredRows } = useFilters(rowsRef);
const { focusRow, selectedRows, selectionSummary } = useSelection();
const includeCollapsedDescendants = ref(false);
const visibleRowsRef = computed(() => filteredRows.value as Array<Record<string, unknown>>);
const { currentSummary, focusSummary } = useAnalysis(visibleRowsRef, aggregatesRef, focusRow, includeCollapsedDescendants);
const expanded = ref(true);

async function handleExport(): Promise<void> {
  if (!state.datasetId) {
    return;
  }
  await exportDataset(state.datasetId);
}
</script>
```
```ts
// frontend/src/pages/BomWorkbench.spec.ts
import { render, screen } from "@testing-library/vue";

import BomWorkbench from "./BomWorkbench.vue";


test("renders upload action and analysis panel placeholder", async () => {
  render(BomWorkbench);

  expect(screen.getByRole("button", { name: "上传 Excel" })).toBeInTheDocument();
  expect(screen.getByText("分析区")).toBeInTheDocument();
});
```

- [ ] **Step 4: 运行联动测试，并执行全量回归**

Run: `cd frontend && npm run test -- src/pages/BomWorkbench.flow.spec.ts`
Expected: PASS，上传后主表显示数据，warning 面板保持可见

Run: `conda run -n test python -m pytest backend/tests -v`
Expected: PASS，后端全部测试通过

Run: `cd frontend && npm run test`
Expected: PASS，前端全部测试通过

- [ ] **Step 5: 提交首版工作台**

```bash
git add frontend/src/pages/BomWorkbench.vue frontend/src/components/upload/UploadPanel.vue frontend/src/api/dataset.ts frontend/src/pages/BomWorkbench.spec.ts frontend/src/pages/BomWorkbench.flow.spec.ts
git commit -m "feat: wire bom workbench flow"
```

## 伪代码草案

### 目标

把固定格式 BOM Excel 导入本地工具，后端统一校验和解析，前端按树表与分析区协同展示，并支持当前视图、焦点节点和框选范围的数量与金额汇总。

### 输入

- `excel_file`：用户上传的 BOM Excel
- `runtime_context`：当前数据集上下文，例如 `dataset_id`、warning、当前筛选条件
- `dependencies`：后端服务与前端 composables

### 输出

- `dataset_payload`：平铺节点与聚合结果
- `analysis_view`：当前范围、焦点节点、框选范围的统计结果
- `export_rows`：导出的当前视图或错误报告

### 伪代码草案

```python
def run_local_bom_tool(excel_file, runtime_context, dependencies):
    # 1. 文件导入先走后端统一校验，避免前后端各写一套规则
    import_result = dependencies.import_service.import_dataset(excel_file)
    if import_result["status"] == "failed":
        return {
            "page_state": "failed",
            "errors": import_result["errors"],
        }

    dataset_id = runtime_context.dataset_store.save(import_result)

    # 2. 前端加载数据集后，把筛选、焦点节点和框选汇总建立在同一份平铺数据上
    dataset_payload = dependencies.dataset_api.fetch_dataset(dataset_id)
    filtered_rows = dependencies.filters.apply(dataset_payload["rows"])

    # 3. 当前视图统计只看筛选后的可见行；焦点节点统计按开关选择是否使用预聚合
    current_summary = dependencies.analysis.summarize_visible_rows(filtered_rows)
    focus_summary = dependencies.analysis.summarize_focus_subtree(
        filtered_rows=filtered_rows,
        subtree_aggregates=dataset_payload["subtree_aggregates"],
        include_collapsed_descendants=runtime_context.include_collapsed_descendants,
    )
    selection_summary = dependencies.selection.summarize_selected_rows(filtered_rows)

    return {
        "page_state": "ready",
        "dataset_id": dataset_id,
        "dataset_payload": dataset_payload,
        "current_summary": current_summary,
        "focus_summary": focus_summary,
        "selection_summary": selection_summary,
    }
```

### 风险点 / 边界条件

- `vxe-table` 的选择交互如果与树形展开冲突，需要优先保住焦点节点和行级多选，不要为了框选牺牲主流程；
- 导出字段必须和主表口径保持一致，否则用户会把导出结果误认为“原始 BOM”；
- 数值空值和非法值必须在后端区分开，不能在前端一律按 `0` 吞掉；
- 根节点哨兵只用于承接 `.1`，不能错误渲染到主表中。

## Self-Review

### Spec 覆盖检查

- 导入、sheet 校验、必填列校验：Task 2、Task 4、Task 5
- 根节点 `0` 不进入分析层级：Task 3
- 平铺节点与 `subtree_aggregates`：Task 3、Task 4
- 导入 API、数据集 API、导出 API：Task 5、Task 6
- 冻结树列、搜索、筛选、状态条：Task 9
- 右侧分析区、焦点节点、框选汇总：Task 10
- warning 展示与工作台串联：Task 8、Task 11

### Placeholder Scan

- 未使用 `TODO`、`TBD`、`后续补` 等占位描述。
- 每个任务都给出了明确文件路径、测试入口、运行命令和提交命令。

### Type Consistency

- 后端统一使用 `rows`、`subtree_aggregates`、`warnings` 作为主数据集字段名。
- 前端统一使用 `datasetId`、`focusRow`、`selectionSummary`、`currentSummary` 作为状态名称。
- 根节点哨兵逻辑只存在于后端解析层，不暴露到前端 UI。
