# 网页端 BOM 查看器升级 PRD（面向问题定位与影响判断）

## 1. 文档信息

- 日期：2026-04-21
- 适用项目：`D:\bochu_work\20- bom结构表`
- 文档目标：在现有“可浏览 BOM”基础上，升级为“更快发现问题、看懂关系、做出判断”的业务工具

---

## 2. 背景与问题定义

现有系统已经具备上传 Excel、树形浏览、基础筛选、基础汇总能力，但仍以“展示数据”为主，尚未形成以下关键价值：

- 无法快速回答“这个零件被哪些上层引用（where-used）”
- 无法对版本差异进行字段级对比
- 无法系统化发现异常（缺字段、失效引用、用量异常等）
- 无法围绕“变更后影响了谁、影响多少成本”给出可用判断

本次升级的核心目标不是把更多列搬到网页，而是减少用户从“看到信息”到“做出动作”的路径长度。

---

## 3. 产品目标（按三层能力）

### 3.1 看数据

- 快速筛选、排序、搜索、导出
- 在单页内完成结构查看和明细核对

### 3.2 看结构

- 清楚理解父子关系、节点路径、引用关系
- 能快速回答“这个件挂在哪一层、在哪些父件下”

### 3.3 看异常和影响

- 自动检测并聚合异常
- 对变更影响进行可追溯分析（受影响父件、成本变化、缺料风险）

---

## 4. 用户角色与核心场景

### 4.1 研发/工艺

- 查询零件上下级关系
- 对比版本变化，确认 ECN 影响范围

### 4.2 采购/计划

- 识别缺料和替代料可用性
- 评估采购周期与库存风险

### 4.3 成本/管理

- 查看成本穿透和贡献占比
- 查看 BOM 健康度与异常分布

---

## 5. 范围定义

### 5.1 MVP（第一版必须完成）

1. 树形 BOM 展示增强
2. 树视图 / 表格视图切换
3. 强搜索（料号、名称、模糊匹配、自动定位）
4. 节点详情侧栏
5. 多维筛选与排序
6. 导出当前结果（口径与当前筛选一致）
7. 版本切换（单版本浏览）

### 5.2 第二版

1. Where-used 反查
2. BOM 对比（A/B）
3. 异常中心（规则检测）
4. 成本汇总与穿透
5. 库存/采购联动字段展示

### 5.3 第三版

1. 关系图可视化模式
2. 权限与审批流
3. ERP/PDM/MES 接口集成
4. 替换模拟与影响评估增强

---

## 6. 信息架构与页面布局

## 6.1 统一工作台布局（推荐）

- 顶部：全局搜索、版本选择、视图切换、导出、异常筛选
- 左侧：目录/过滤面板
- 中间：主视图（树表）
- 右侧：节点详情与分析卡片
- 底部：状态条（行数、金额、异常计数、当前上下文）

### 6.2 主视图模式

1. 树视图：以父子结构为核心
2. 平铺表格：以筛选排序和批量核对为核心
3. 路径视图：显示 `A > B > C > D`
4. 对比视图（二期）：显示新增/删除/变化

---

## 7. 功能需求（可验收）

### 7.1 树形展开/收起

必须支持：

1. 单节点展开/收起
2. 全部展开/全部收起
3. 展开到第 N 层
4. 记忆展开状态（同一 `dataset_id` 会话内）
5. 当前节点路径高亮

验收标准：

1. 5000 行级别数据中，单次展开交互 < 150ms（感知层）
2. 展开状态在视图切换后可恢复

### 7.2 视图切换（树/表/路径）

必须支持：

1. 树视图与平铺表格一键切换
2. 路径列可显示完整祖先链
3. 切换后保留当前搜索与筛选上下文

### 7.3 强搜索

必须支持：

1. 按料号、名称搜索
2. 模糊搜索（含大小写不敏感）
3. 结果定位并自动展开路径
4. 显示命中节点在哪些父件下出现

二期增强：

1. 同义词/别名词典
2. 组合关键词搜索（AND）
3. 引用次数统计

### 7.4 筛选与排序

筛选维度（MVP）：

1. 层级
2. 物料属性
3. 状态
4. 版本
5. 外购/自制
6. 金额区间
7. 缺失关键字段（布尔）

排序维度（MVP）：

1. 料号
2. 层级
3. 用量
4. 金额
5. 更新时间（如有）

### 7.5 节点详情侧栏

点击节点后展示：

1. 基本信息（料号、名称、规格、版本、单位）
2. 用量与损耗
3. 来源与替代料
4. 状态与生失效日期
5. 成本与库存字段
6. 图纸/附件链接（占位字段可先保留）

### 7.6 Where-used（第二版）

必须支持：

1. 输入料号，返回所有父件路径列表
2. 统计出现次数与涉及产品数
3. 点击结果可跳转主树定位

### 7.7 BOM 对比（第二版）

必须支持：

1. A/B 版本选择
2. 差异类型：新增、删除、数量变化、字段变化
3. 字段级变更明细（如用量、替代料、生效日期）
4. 导出差异报告

### 7.8 异常中心（第二版）

首批规则：

1. 缺失关键属性
2. 用量 <= 0
3. 重复挂载
4. 循环引用
5. 失效物料仍被引用
6. 成本缺失

必须支持：

1. 按严重级别筛选
2. 一键定位到异常节点
3. 异常统计总览卡片

### 7.9 成本与影响分析（第二版）

必须支持：

1. 子树成本汇总
2. 子件成本贡献占比
3. 变更影响对象列表（父件/整机）
4. 替换后成本模拟（MVP 可做静态试算）

---

## 8. 数据模型与接口契约（建议）

### 8.1 新增/扩展数据结构

`BomNode` 增强字段建议：

1. `path_codes: list[str]`
2. `path_names: list[str]`
3. `where_used_count: int`
4. `is_anomalous: bool`
5. `anomaly_codes: list[str]`

`AnomalyItem`：

1. `id`
2. `severity`
3. `code`
4. `node_id`
5. `field`
6. `message`
7. `action`

`CompareDiffItem`：

1. `node_key`
2. `change_type`（added/removed/modified）
3. `changed_fields`
4. `before`
5. `after`

### 8.2 API（目标形态）

1. `POST /api/import`：导入并生成数据集
2. `GET /api/datasets/{dataset_id}`：读取节点和聚合（支持 query 参数：搜索、筛选、排序、分页）
3. `POST /api/datasets/{dataset_id}/export`：按当前 query 导出
4. `GET /api/datasets/{dataset_id}/where-used?code=...`（二期）
5. `POST /api/datasets/compare`（二期）
6. `GET /api/datasets/{dataset_id}/anomalies`（二期）
7. `POST /api/datasets/{dataset_id}/impact`（二期）

---

## 9. 非功能性要求

### 9.1 性能

1. 大数据量使用虚拟滚动
2. 树渲染采用懒加载或分段展开
3. 搜索定位时间在 10k 节点下可控（目标 < 500ms）

### 9.2 正确性

1. 金额使用 `Decimal` 全链路处理
2. 导出口径必须与当前筛选一致
3. 比对和异常规则结果可复算

### 9.3 可观测性

1. 接口日志携带 `request_id`
2. 记录导入摘要、规则执行摘要、对比摘要
3. 异常检测提供可审计明细

---

## 10. 与当前代码的改造映射（最小返工）

### 10.1 后端优先改造

1. `backend/app/api/routes_export.py`
   当前问题：`dataset_id` 不存在时缺少显式错误返回  
   目标：统一错误模型，补 `404 + code/message/retryable`

2. `backend/app/services/import_service.py`
   当前问题：仅生成基础行与聚合  
   目标：补 `path`、`where-used` 索引、异常规则入口

3. `backend/app/core/dataset_store.py`
   当前问题：纯内存且无生命周期管理  
   目标：增加 TTL 与数据集元信息（版本、导入时间、来源）

### 10.2 前端优先改造

1. `frontend/src/composables/useFilters.ts`
   当前问题：本地过滤维度有限  
   目标：扩展多维筛选与排序模型

2. `frontend/src/components/bom/BomGrid.vue`
   当前问题：搜索展开逻辑有全表重复扫描热点  
   目标：预构建 `children_map`，降低递归复杂度

3. `frontend/src/pages/BomWorkbench.vue`
   当前问题：缺视图切换与上下文统一状态  
   目标：引入工作台状态机（视图模式、选中节点、查询快照）

4. `frontend/src/components/analysis/AnalysisPanel.vue`
   当前问题：只有汇总卡片  
   目标：升级为详情 + 异常 + 影响联动面板

---

## 11. 里程碑建议

### 里程碑 M1（1-2 周）

1. 查询模型统一（搜索/筛选/排序/导出快照）
2. 树/表/路径三视图切换
3. 节点详情侧栏

### 里程碑 M2（2-3 周）

1. Where-used
2. 异常中心（首批规则）
3. BOM A/B 对比

### 里程碑 M3（2 周）

1. 成本穿透与影响分析
2. 关系图模式
3. 对接 ERP/PDM 的接口预留

---

## 实施状态（2026-04-22 更新）

- [x] 查询快照与导出口径一致（前后端一致协议）
- [x] 路径与 where-used 基础能力
- [x] 异常规则扫描与异常中心入口
- [x] 节点详情侧栏
- [x] 搜索展开性能优化（children_map + 行索引）
- [ ] 版本 A/B 对比完整链路
- [ ] 关系图可视化
- [ ] ERP/PDM/MES 集成

---

## 12. 验收标准（整体）

1. 用户可在 30 秒内定位任一料号的上层路径
2. 用户可在 1 分钟内识别当前版本主要异常分布
3. 用户可在 2 分钟内完成 A/B 版本差异核对并导出报告
4. 在 10k 节点规模下，页面交互保持可用（无明显卡死）

---

## 13. 风险点与边界条件

1. 源数据脏值比例高时，规则引擎易产生噪音，需分级展示并支持静音规则
2. 多根节点 BOM 需保持路径构建正确，避免跨根污染
3. 对比逻辑必须定义稳定主键策略，避免“误判新增/删除”
4. 前端不应把复杂业务计算全部放本地，避免性能和口径不一致

---

## 14. 伪代码草案

### 14.1 目标

说明“导入 -> 索引 -> 校验 -> 查询 -> 影响分析”的最小闭环流程。

### 14.2 输入

1. `input_payload`：上传文件、查询条件、版本对比参数
2. `runtime_context`：`request_id`、`dataset_id`、操作人信息
3. `dependencies`：parser、indexer、rule_engine、compare_service、export_service

### 14.3 输出

1. `success_result`：结构化结果（rows、aggregates、anomalies、impact）
2. `retry_result`：可重试错误（上游超时、临时依赖失败）
3. `error_result`：不可重试错误（格式错误、数据集不存在）

### 14.4 伪代码草案

```python
# 目标：把 BOM 查看器从“展示工具”升级为“判断工具”
# 输入：
# - input_payload: 上传文件或查询请求
# - runtime_context: request_id, dataset_id, 用户上下文
# - dependencies: parser/indexer/rule_engine/compare/export 等服务
# 输出：
# - success_result: 查询或分析成功结果
# - retry_result: 可恢复错误
# - error_result: 不可恢复错误

def process_bom_request(input_payload, runtime_context, dependencies):
    if not input_payload:
        return build_error_result(
            error_code="INVALID_INPUT",
            message="请求参数不能为空",
            retryable=False,
        )

    try:
        if input_payload.action == "import":
            # 为什么先解析再建索引：索引依赖稳定的 parent-child 关系，脏结构会污染后续结果
            rows, parse_errors = dependencies.parser.parse_excel(input_payload.file)
            if has_fatal(parse_errors):
                return build_error_result(
                    error_code="INVALID_WORKBOOK",
                    message="BOM 文件结构无效",
                    retryable=False,
                    details=parse_errors,
                )

            # 为什么预建索引：where-used / 路径定位 / 影响分析都依赖倒排与路径缓存
            indexes = dependencies.indexer.build_indexes(rows)
            aggregates = dependencies.indexer.build_subtree_aggregates(rows)

            # 为什么导入阶段就跑规则：避免用户打开后才发现数据不可用
            anomalies = dependencies.rule_engine.scan(rows, indexes)

            dataset_id = save_dataset(rows, indexes, aggregates, anomalies)
            return build_success_result(
                dataset_id=dataset_id,
                summary=build_import_summary(rows, anomalies, parse_errors),
            )

        if input_payload.action == "query":
            dataset = load_dataset(input_payload.dataset_id)
            if not dataset:
                return build_error_result(
                    error_code="DATASET_NOT_FOUND",
                    message="数据集不存在或已过期",
                    retryable=False,
                )

            # 为什么查询快照要统一：保证“页面看到什么，导出就是什么”
            result_rows = apply_query_snapshot(dataset.rows, input_payload.query)
            return build_success_result(
                rows=result_rows,
                aggregates=dataset.aggregates,
                anomalies=filter_anomalies(dataset.anomalies, input_payload.query),
            )

        if input_payload.action == "where_used":
            dataset = load_dataset(input_payload.dataset_id)
            paths = dataset.indexes.reverse_index.get(input_payload.code, [])
            return build_success_result(code=input_payload.code, paths=paths)

        if input_payload.action == "compare":
            # 为什么按稳定键比对：避免因行号变化导致误判
            left = load_dataset(input_payload.left_dataset_id)
            right = load_dataset(input_payload.right_dataset_id)
            diffs = dependencies.compare_service.diff_by_stable_key(left.rows, right.rows)
            return build_success_result(differences=diffs)

        if input_payload.action == "impact":
            dataset = load_dataset(input_payload.dataset_id)
            impact = dependencies.compare_service.impact_analysis(
                dataset=dataset,
                code=input_payload.code,
                change=input_payload.change_payload,
            )
            return build_success_result(impact=impact)

        return build_error_result(
            error_code="UNSUPPORTED_ACTION",
            message="不支持的请求动作",
            retryable=False,
        )

    except TimeoutError:
        return build_retry_result(
            error_code="UPSTREAM_TIMEOUT",
            message="服务暂时不可用，请稍后重试",
            retryable=True,
        )
    except Exception:
        return build_error_result(
            error_code="INTERNAL_ERROR",
            message="系统内部错误",
            retryable=False,
        )
```
