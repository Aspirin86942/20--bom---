# BOM 本地分析工具设计文档

## 1. 背景

当前 BOM Excel 以树形明细表为主，虽然可以顺着 `BOM层级` 阅读父子关系，但在以下场景中效率较低：

- 需要快速筛选 `自制 / 外购 / 委外` 子项；
- 需要查看某个父项或某个模块下的数量合计、金额合计；
- 需要在横向查看供应商、单价、金额等字段时，仍然保持对 BOM 层级关系的感知；
- 需要对不同 BOM 文件重复执行同样的分析，而不是只针对单一文件做一次性整理。

用户希望做成一个本地可重复使用的小工具：

- 通过网页界面使用；
- 支持上传固定格式的 BOM Excel；
- 主界面保留 BOM 树形展开体验；
- 同时支持筛选、自制外购分析、数量金额汇总、框选汇总和导出。

## 2. 目标

- 提供一个本地网页工具，支持重复导入同格式 BOM Excel。
- 以树形表格展示 BOM 结构，保留逐层展开/收起体验。
- 让用户可以围绕 `编码`、`名称`、`物料属性`、`数量`、`金额` 做高频分析。
- 支持在当前视图、焦点节点子树和用户选择范围上做数量与金额汇总。
- 对 BOM 导入过程中的结构错误和脏数据给出可审计、可导出的错误报告。

## 3. 非目标

- 首版不支持多种来源格式的 BOM 自由映射。
- 首版不做多文件对比。
- 首版不做数据库持久化、历史版本管理、权限控制和多人协作。
- 首版不做 Excel 式单元格公式编辑。
- 首版不自动修复层级错误、缺父级等脏数据。

## 4. 输入前提

### 4.1 文件前提

- 文件类型固定为 `.xlsx`。
- 默认从 `子项明细` sheet 读取数据。
- 后续导入的 BOM 文件结构与本次样例文件保持基本一致。

### 4.2 必填列

首版至少要求以下列存在：

- `BOM层级`
- `子项物料编码`
- `物料名称`
- `物料属性`
- `实际数量`
- `金额`

### 4.3 关键口径

- 根节点 `BOM层级 = 0` 仅作为树根上下文，不作为分析中的 `1级` 节点。
- 根节点行在解析器内部会转换为 `level = 0` 的上下文哨兵节点，用于承接 `.1` 节点，但不会输出到前端主表。
- 分析中的 `1级` 从 `.1` 开始计算。
- 金额与精确数值在后端统一按 `Decimal` 处理，对外返回时再做安全转换。

## 5. 用户核心场景

### 5.1 结构浏览

用户上传 BOM 后，在主表中按层级展开查看某个总成、模块或子项的构成关系。

### 5.2 自制 / 外购 / 委外分析

用户按 `物料属性` 筛选，并查看某个总成或当前结果集内：

- 行数；
- 数量合计；
- 金额合计；
- 自制 / 外购 / 委外的金额占比。

### 5.3 焦点节点子树分析

用户点击某个父节点后，右侧分析区切换到该节点的子树分析，并可选择：

- 仅统计当前可见行；
- 包含已折叠子项。

### 5.4 框选汇总

用户在当前主表可见区域内选择一批行，对这批行实时查看：

- 选中行数；
- 数量合计；
- 金额合计；
- 自制 / 外购 / 委外金额分布。

### 5.5 导出

用户将当前视图结果、当前焦点节点子树或导入错误报告导出，以便进一步沟通或回查源数据。

## 6. 整体方案

本工具采用本地前后端分离架构，但以前后端同仓库方式组织：

- 后端负责 Excel 导入、结构校验、BOM 解析、聚合统计、错误报告、导出；
- 前端负责树表展示、筛选、搜索、节点聚焦、选择汇总、分析看板；
- 数据默认只保存在内存或本地临时目录中，不落库。

### 6.1 技术选型

- 前端：`Vue 3`
- 前端页面组件：`Element Plus`
- 主表组件：`vxe-table`
- 后端：`FastAPI`
- Excel 读取：`pandas + openpyxl`
- 金额与精确数值：`decimal.Decimal`

### 6.2 选型理由

- `Vue 3` 适合构建本地分析型网页工具，状态联动清晰；
- `Element Plus` 适合承载上传、面板、筛选、抽屉等企业后台式界面；
- `vxe-table` 更适合大表格、树形、固定列、列分组和复杂交互；
- `FastAPI` 适合快速搭建本地 API，同时便于后续扩展导出、校验和规则模块；
- `pandas + openpyxl` 可以在不破坏 Excel 读写稳定性的前提下完成导入和导出。

## 7. 页面结构设计

### 7.1 顶部操作区

用于承载高频动作：

- 上传 Excel
- 重新解析
- 导出当前结果
- 搜索编码 / 名称
- 清空筛选

设计原则：

- 保持轻量，不把筛选条件堆在顶部；
- 让用户进入页面后能立即开始导入和浏览。

### 7.2 主体布局

主体区域采用两栏结构：

- 中间主表：冻结树列 + 可横向滚动的数据区
- 右侧分析区：默认展开，可折叠

#### 7.2.1 主表的冻结树列

冻结树列放在主表最左侧，用于维持用户对层级关系的感知，字段包括：

- 展开键
- 层级缩进
- 物料编码
- 物料名称

设计原则：

- 无论用户如何横向滚动查看金额、单价、供应商，都不能丢失“这一行属于哪个父项”的上下文；
- 冻结树列支持拖拽调宽，但最大宽度不超过页面总宽度的约 40%；
- 树列中可加入淡灰色层级引导线，提升层级可读性。

#### 7.2.2 中间滚动数据区

数据区按列组组织，避免字段过长时完全失控。

默认列组如下：

`属性关系`

- 物料属性
- 当前层级
- 父级编码
- 父级名称
- 是否叶子节点

`数量金额`

- 实际数量
- 标准用量
- 单价
- 金额
- 币别

`采购来源`

- 供应商
- 材料单价来源

`版本状态`

- BOM版本
- 数据状态
- 生效日期
- 失效日期

首版默认显示建议收敛为：

- 物料属性
- 实际数量
- 单价
- 金额
- 父级编码
- 供应商
- 当前层级

#### 7.2.3 右侧分析区

右侧分析区默认展开，并支持折叠。建议通过轻量切换条进行收起和展开。

分析区包含三部分：

`当前范围汇总`

- 当前范围总行数
- 当前范围数量合计
- 当前范围金额合计
- 自制金额合计
- 外购金额合计
- 委外金额合计
- 自制 / 外购 / 委外金额占比

`框选结果汇总`

- 框选行数
- 框选数量合计
- 框选金额合计
- 框选范围内自制金额合计
- 框选范围内外购金额合计
- 框选范围内委外金额合计

`筛选条件`

- 物料属性
- 当前层级
- 父级编码 / 名称
- 金额区间
- 是否仅看叶子节点

### 7.3 底部状态条

主表底部建议固定一条状态条，用于快速显示：

- 当前视图：行数、数量合计、金额合计
- 当前框选：行数、数量合计、金额合计

这样用户在连续浏览和选择过程中不需要频繁移动视线到右侧分析区。

## 8. 交互口径

### 8.1 节点展开 / 收起

- 默认展开到 `.1`
- 支持单节点展开 / 收起
- 支持全部展开 / 全部折叠

### 8.2 焦点节点

- 单击某一行，将该行设为焦点节点；
- 右侧分析区切换到该节点对应的子树统计；
- 对焦点节点分析提供一个开关：
  - `仅当前可见`
  - `包含已折叠子项`

该开关用于区分两类真实场景：

- 物理组成视角：查看整个父项的完整成本构成；
- 当前层级视角：只关注眼前已展开的直属模块。

### 8.3 行级选择与框选

首版明确采用“按行选择”的交互，不做 Excel 式单元格区域运算。

建议交互如下：

- 单击：设置焦点节点
- `Shift + 点击`：选择连续行
- `Ctrl / Command + 点击`：选择离散行
- 鼠标拖拽：在当前可见区域中框选多行

#### 8.3.1 框选统计口径

- 只统计当前可见行；
- 折叠隐藏的子项不自动计入；
- 选择结果立即联动到右侧分析区和底部状态条；
- 汇总字段首版固定为：
  - `实际数量`
  - `金额`

这样可以保证“所见即所得”，避免出现用户未看到却被统计进去的隐藏数据。

### 8.4 搜索与筛选

首版支持以下高频筛选：

- 按编码 / 名称搜索
- 按物料属性筛选
- 按当前层级筛选
- 按父级编码 / 名称筛选
- 按金额区间筛选
- 按是否叶子节点筛选

## 9. 数据模型设计

后端不直接返回深层嵌套树，而是返回：

- `flat_rows`
- `subtree_aggregates`
- `column_groups`
- `warnings`

这种设计的目的，是让前端在渲染树表、筛选、搜索和切换焦点节点时保持性能稳定。

### 9.1 平铺节点结构

单行节点建议至少包含以下字段：

```json
{
  "id": "row_102",
  "parent_id": "row_87",
  "level": 3,
  "sort_index": 102,
  "bom_level_raw": "...3",
  "top_level_code": "C.T.D0005AA",
  "top_level_name": "HypTronic3_HPC3870E数控主机",
  "parent_code": "B.WW.T0019AA",
  "parent_name": "HPC3870E委外半成品",
  "code": "B.P.C0001AA",
  "name": "BMC228B_Ecat主站卡(HYP)",
  "attr": "自制",
  "unit": "个",
  "qty_actual": 1,
  "price": "298.487565",
  "amount": "298.49",
  "supplier": null,
  "price_source": "按BOM子项卷算",
  "is_leaf": false,
  "has_children": true,
  "path_codes": ["C.T.D0005AA", "B.WW.T0019AA", "B.P.C0001AA"],
  "path_names": ["HypTronic3_HPC3870E数控主机", "HPC3870E委外半成品", "BMC228B_Ecat主站卡(HYP)"]
}
```

### 9.2 子树聚合结构

为了支撑右侧分析区的高频读取，后端需要为每个节点预计算子树聚合结果：

```json
{
  "row_102": {
    "subtree_row_count": 128,
    "subtree_qty_sum": "842",
    "subtree_amount_sum": "53210.40",
    "amount_by_attr": {
      "自制": "10230.00",
      "外购": "38890.40",
      "委外": "4090.00"
    }
  }
}
```

### 9.3 列组元数据

后端同时返回前端列组定义，便于前端保持字段顺序和导出口径一致。

## 10. 导入、校验与错误处理

### 10.1 校验阶段

导入分为三个层次：

`文件级校验`

- 是否为 `.xlsx`
- 文件是否可打开
- `子项明细` sheet 是否存在

`结构级校验`

- 必填列是否存在
- 表头是否重复
- 数据区是否为空

`业务级校验`

- `BOM层级` 是否可解析
- 是否存在层级跳跃
- 是否存在缺少父级节点
- `物料属性` 是否属于允许范围
- `实际数量`、`金额` 是否为合法数值

### 10.2 错误分级

#### 10.2.1 Fatal

出现 Fatal 时，禁止进入分析页：

- 文件无法打开
- 缺少目标 sheet
- 缺少必填列
- `BOM层级` 无法成批解析
- 层级跳跃导致无法建立正确父子关系
- 缺少父级节点，无法还原路径

#### 10.2.2 Warning

出现 Warning 时，允许进入分析，但需要持续提示：

- 个别行 `金额` 为空
- 个别行 `实际数量` 为空
- 个别行 `物料属性` 为未知值
- 某些文本字段为空
- 个别不影响整体结构的异常行被跳过

### 10.3 错误模型

错误返回必须结构化，至少包含：

- 错误级别
- 错误码
- 行号
- 字段名
- 原值
- 原因
- 建议处理动作

示例如下：

```json
{
  "severity": "fatal",
  "code": "LEVEL_JUMP",
  "row_index": 128,
  "field": "BOM层级",
  "raw_value": "...3",
  "message": "层级从 1 级直接跳到 3 级，缺少 2 级父节点",
  "action": "请修正 Excel 后重新导入"
}
```

### 10.4 错误展示

前端需要提供两层提示：

- 导入结果面板：显示 fatal / warning 数量，支持查看明细；
- 主页面顶部横条：若存在 warning，则持续提示并可展开查看。

## 11. 导出规则

首版支持以下导出：

- 导出当前视图
- 导出当前焦点节点子树
- 导出导入错误报告

导出原则：

- 字段顺序尽量与当前页面展示一致；
- 导出结果必须明确标注是“当前视图”还是“焦点子树”；
- 错误报告独立导出，便于回查和修正源文件。

## 12. API 设计

首版建议保留最小 API 集合。

### 12.1 `POST /api/import`

用途：

- 上传 Excel
- 完成校验、解析、预聚合
- 返回 `dataset_id` 与导入摘要

### 12.2 `GET /api/datasets/{dataset_id}`

用途：

- 获取平铺节点
- 获取聚合结果
- 获取列组元数据
- 获取 warning 信息

### 12.3 `POST /api/datasets/{dataset_id}/export`

用途：

- 按当前视图或焦点节点导出结果

## 13. 项目结构建议

建议采用前后端同仓库结构：

```text
bom-tool/
  backend/
    app/
      main.py
      api/
      core/
      schemas/
      services/
      validators/
      utils/
  frontend/
    src/
      api/
      components/
      composables/
      pages/
      types/
  samples/
  docs/
```

### 13.1 后端职责拆分

- `validators/workbook_validator.py`
  负责文件、sheet、列头校验
- `validators/business_validator.py`
  负责层级跳跃、缺父级、属性非法和数值异常校验
- `services/parse_service.py`
  负责把 Excel 行转换为 `flat_rows`
- `services/aggregate_service.py`
  负责预计算子树统计
- `services/export_service.py`
  负责导出当前结果和错误报告

### 13.2 前端职责拆分

- `UploadPanel.vue`
  负责上传和解析状态显示
- `BomGrid.vue`
  负责主表展示、树形展开、固定列、选择联动
- `BomGridToolbar.vue`
  负责搜索与主表快捷操作
- `BomGridStatusBar.vue`
  负责当前视图和框选汇总
- `AnalysisPanel.vue`
  负责右侧分析面板
- `ErrorDrawer.vue`
  负责错误与 warning 明细展示

## 14. 一期功能边界

### 14.1 一期必须完成

- 上传固定格式 BOM Excel
- 文件 / 结构 / 业务三级校验
- Fatal 错误拦截，Warning 持续提示
- BOM 树形展示
- 根节点 `0` 不作为分析层级输出
- 按编码 / 名称搜索
- 按属性 / 层级 / 金额 / 父级筛选
- 焦点节点子树分析
- 当前视图数量合计与金额合计
- 框选范围数量合计与金额合计
- 导出当前视图
- 导出焦点节点子树
- 导出错误报告

### 14.2 一期不做

- 多文件对比
- 历史导入记录
- 数据库存储
- 权限与账号
- 在线协作
- Excel 式单元格公式编辑
- 自动修复脏数据

## 15. 实施顺序建议

建议开发顺序如下：

1. 完成后端 Excel 校验与解析；
2. 输出稳定的 `flat_rows + subtree_aggregates`；
3. 以样例文件完成口径验证；
4. 前端实现静态主表骨架；
5. 接入树形展开 / 收起和焦点节点联动；
6. 接入右侧分析区；
7. 接入筛选与搜索；
8. 接入行级选择与框选汇总；
9. 实现导出和错误展示。

这个顺序的原因是：

- 先保证数据口径正确；
- 再保证交互和可视化顺畅；
- 最后补输出和边缘体验。

## 16. 验收标准

- 能导入固定格式 BOM Excel
- 能识别并阻断 Fatal 错误
- 能在主表中按层级展开 / 收起
- 能按 `编码 / 名称 / 物料属性 / 层级 / 金额` 做筛选和搜索
- 能点击父节点查看其子树分析
- 能统计当前视图的数量合计与金额合计
- 能统计框选结果的数量合计与金额合计
- 能导出当前视图、焦点子树和错误报告

## 17. 风险点 / 边界条件

- `vxe-table` 的树形、固定列和自定义选择交互需要尽早做最小原型验证；
- 若数值字段存在混合格式，需要明确区分“空值”和“非法值”；
- 若源文件中存在多个根上下文，需要保证不同区段的路径计算互不污染；
- 前端导出必须与当前视图口径一致，避免“页面看到的”和“导出的”不一致；
- 首版不做自动修复，避免因猜测修复导致金额口径失真。

## 18. 伪代码草案

### 18.1 目标

说明 BOM 工具如何校验输入、解析层级、生成分析数据、返回结构化结果，并支撑前端树表和分析面板。

### 18.2 输入

- `excel_file`：用户上传的固定格式 BOM Excel
- `runtime_context`：当前导入上下文，例如请求时间、文件名、临时存储路径
- `dependencies`：解析、校验、聚合、导出等服务对象

### 18.3 输出

- `success_result`：成功时返回 `dataset_id`、`flat_rows`、`subtree_aggregates`、`warnings`
- `partial_result`：存在 Warning 时的可用数据集
- `error_result`：存在 Fatal 时返回的结构化错误报告，至少包含 `error_code`、`message`、`retryable`

### 18.4 伪代码草案

```python
# [伪代码草案]
# 目标：把固定格式 BOM Excel 解析成可供前端树表展示和分析的统一数据集
# 输入：
# - excel_file: 用户上传的 BOM Excel
# - runtime_context: 当前执行上下文，例如文件名、request_id、临时目录
# - dependencies: 外部依赖集合，例如 validator、parser、aggregator、exporter、logger
# 输出：
# - success_result: 成功时返回 dataset_id、rows、subtree_aggregates、warnings
# - partial_result: 可继续分析但带 warning 的结果
# - error_result: 不可恢复时返回结构化错误，至少包含 error_code、message、retryable

from typing import Any

def import_bom_dataset(
    excel_file: Any,
    runtime_context: Any,
    dependencies: Any,
) -> dict[str, Any]:
    errors: list[dict[str, Any]] = []
    level_stack: dict[int, dict[str, Any]] = {}
    parsed_rows: list[dict[str, Any]] = []

    # 1. 文件级校验：文件打不开或缺少目标 sheet 时，后续所有处理都没有意义
    workbook = dependencies.validator.open_workbook_or_collect_error(
        excel_file, errors, runtime_context
    )
    if workbook is None:
        return build_error_result(
            error_code="INVALID_WORKBOOK",
            message="Excel 文件无法读取",
            retryable=False,
            errors=errors,
        )

    sheet = dependencies.validator.get_sheet_or_collect_error(
        workbook, "子项明细", errors
    )
    if sheet is None:
        return build_error_result(
            error_code="MISSING_SHEET",
            message="缺少子项明细 sheet",
            retryable=False,
            errors=errors,
        )

    raw_rows = dependencies.parser.read_sheet_rows(sheet)

    # 2. 结构级校验：必填列缺失时直接终止，避免带着不完整字段继续解析
    dependencies.validator.validate_required_columns(
        raw_rows,
        required_columns=[
            "BOM层级",
            "子项物料编码",
            "物料名称",
            "物料属性",
            "实际数量",
            "金额",
        ],
        errors=errors,
    )
    if has_fatal_errors(errors):
        return build_error_result(
            error_code="INVALID_COLUMNS",
            message="Excel 表头结构不符合要求",
            retryable=False,
            errors=errors,
        )

    # 3. 业务级校验 + 解析：尽量收集多条错误，而不是在第一处异常就提前中断
    for row_index, raw in enumerate(raw_rows, start=2):
        depth = dependencies.parser.parse_depth_or_collect_error(raw, row_index, errors)
        if depth is None:
            continue

        # 根节点 0 不进入分析输出，但会被转换成内部哨兵节点，用来承接后续的 .1 节点
        if depth == 0:
            level_stack = {
                0: dependencies.parser.build_root_context(
                    raw=raw,
                    row_index=row_index,
                )
            }
            continue

        # 为什么这样做：层级跳跃和缺父级会直接破坏树结构，必须明确阻断
        if is_level_jump(depth, level_stack):
            collect_error(
                errors,
                severity="fatal",
                code="LEVEL_JUMP",
                row_index=row_index,
                field="BOM层级",
                raw_value=raw.get("BOM层级"),
                message="层级跳跃，缺少父级节点",
                action="请修正源 Excel 后重新导入",
            )
            continue

        parent = level_stack.get(depth - 1)
        if parent is None:
            collect_error(
                errors,
                severity="fatal",
                code="MISSING_PARENT",
                row_index=row_index,
                field="BOM层级",
                raw_value=raw.get("BOM层级"),
                message="当前节点缺少父级，无法建立完整路径",
                action="请修正源 Excel 后重新导入",
            )
            continue

        parsed = dependencies.parser.build_flat_row(
            raw=raw,
            parent=parent,
            depth=depth,
            row_index=row_index,
        )
        parsed_rows.append(parsed)
        level_stack[depth] = parsed
        remove_deeper_levels(level_stack, depth)

    if has_fatal_errors(errors):
        return build_error_result(
            error_code="INVALID_BOM_STRUCTURE",
            message="BOM 结构存在不可恢复错误",
            retryable=False,
            errors=errors,
        )

    # 4. 预聚合：右侧分析区会高频读取子树统计，提前计算可以保证交互毫秒级响应
    subtree_aggregates = dependencies.aggregator.build_subtree_aggregates(parsed_rows)

    if has_warning_errors(errors):
        return build_partial_success_result(
            rows=parsed_rows,
            subtree_aggregates=subtree_aggregates,
            warnings=errors,
        )

    return build_success_result(
        rows=parsed_rows,
        subtree_aggregates=subtree_aggregates,
    )
```

### 18.5 风险点 / 边界条件

- 如果源 Excel 存在大量脏数据，错误收集逻辑要防止被单次导入放大到不可读；
- 如果同一层级连续切换到不同区段，必须及时清理 `level_stack` 中已失效的深层节点；
- 如果某些 Warning 行被跳过，前端必须明确区分“源行数”和“有效行数”；
- 如果后续支持更多字段，必须保证字段扩展不改变既有聚合口径。
