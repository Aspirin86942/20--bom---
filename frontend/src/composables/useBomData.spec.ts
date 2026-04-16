import { describe, it, expect } from "vitest";

import type { FlatRow } from "../types/dataset";
import { collectMatchedSubtrees } from "./useBomData";


describe("collectMatchedSubtrees", () => {
  // 构建测试数据：树形结构
  // root (0)
  //   ├─ A (1)
  //   │   ├─ A1 (2)
  //   │   └─ A2 (3)
  //   └─ B (4)
  //       └─ B1 (5)
  const testRows: FlatRow[] = [
    {
      id: "0",
      parent_id: "",
      level: 0,
      code: "ROOT",
      name: "根节点",
      attr: "自制",
      qty_actual: "1",
      amount: "0",
      spec_model: "",
      bom_version: "",
      data_status: "",
      unit: "",
      sub_item_type: "",
      qty_numerator: 1,
      qty_denominator: 1,
      standard_qty: 1,
      currency: "",
      unit_price: 0,
      tax_rate: 0,
      unit_price_with_tax: 0,
      total_price_with_tax: 0,
      price_source: "",
      supplier: "",
    },
    {
      id: "1",
      parent_id: "0",
      level: 1,
      code: "A",
      name: "物料A",
      attr: "自制",
      qty_actual: "1",
      amount: "100",
      spec_model: "",
      bom_version: "",
      data_status: "",
      unit: "",
      sub_item_type: "",
      qty_numerator: 1,
      qty_denominator: 1,
      standard_qty: 1,
      currency: "",
      unit_price: 0,
      tax_rate: 0,
      unit_price_with_tax: 0,
      total_price_with_tax: 0,
      price_source: "",
      supplier: "",
    },
    {
      id: "2",
      parent_id: "1",
      level: 2,
      code: "A1",
      name: "物料A1",
      attr: "外购",
      qty_actual: "2",
      amount: "50",
      spec_model: "",
      bom_version: "",
      data_status: "",
      unit: "",
      sub_item_type: "",
      qty_numerator: 1,
      qty_denominator: 1,
      standard_qty: 1,
      currency: "",
      unit_price: 0,
      tax_rate: 0,
      unit_price_with_tax: 0,
      total_price_with_tax: 0,
      price_source: "",
      supplier: "",
    },
    {
      id: "3",
      parent_id: "1",
      level: 2,
      code: "A2",
      name: "物料A2",
      attr: "外购",
      qty_actual: "1",
      amount: "50",
      spec_model: "",
      bom_version: "",
      data_status: "",
      unit: "",
      sub_item_type: "",
      qty_numerator: 1,
      qty_denominator: 1,
      standard_qty: 1,
      currency: "",
      unit_price: 0,
      tax_rate: 0,
      unit_price_with_tax: 0,
      total_price_with_tax: 0,
      price_source: "",
      supplier: "",
    },
    {
      id: "4",
      parent_id: "0",
      level: 1,
      code: "B",
      name: "物料B",
      attr: "委外",
      qty_actual: "1",
      amount: "200",
      spec_model: "",
      bom_version: "",
      data_status: "",
      unit: "",
      sub_item_type: "",
      qty_numerator: 1,
      qty_denominator: 1,
      standard_qty: 1,
      currency: "",
      unit_price: 0,
      tax_rate: 0,
      unit_price_with_tax: 0,
      total_price_with_tax: 0,
      price_source: "",
      supplier: "",
    },
    {
      id: "5",
      parent_id: "4",
      level: 2,
      code: "B1",
      name: "物料B1",
      attr: "外购",
      qty_actual: "3",
      amount: "200",
      spec_model: "",
      bom_version: "",
      data_status: "",
      unit: "",
      sub_item_type: "",
      qty_numerator: 1,
      qty_denominator: 1,
      standard_qty: 1,
      currency: "",
      unit_price: 0,
      tax_rate: 0,
      unit_price_with_tax: 0,
      total_price_with_tax: 0,
      price_source: "",
      supplier: "",
    },
  ];

  it("应该收集单个匹配节点及其子树", () => {
    const matchedIds = new Set(["1"]); // 匹配物料A
    const result = collectMatchedSubtrees(matchedIds, testRows);

    // 应该包含 A, A1, A2
    expect(result.size).toBe(3);
    expect(result.has("1")).toBe(true);
    expect(result.has("2")).toBe(true);
    expect(result.has("3")).toBe(true);
  });

  it("应该收集多个匹配节点及其子树", () => {
    const matchedIds = new Set(["1", "4"]); // 匹配物料A和B
    const result = collectMatchedSubtrees(matchedIds, testRows);

    // 应该包含 A, A1, A2, B, B1
    expect(result.size).toBe(5);
    expect(result.has("1")).toBe(true);
    expect(result.has("2")).toBe(true);
    expect(result.has("3")).toBe(true);
    expect(result.has("4")).toBe(true);
    expect(result.has("5")).toBe(true);
  });

  it("应该收集叶子节点（无子节点）", () => {
    const matchedIds = new Set(["2"]); // 匹配物料A1（叶子节点）
    const result = collectMatchedSubtrees(matchedIds, testRows);

    // 只包含 A1 自己
    expect(result.size).toBe(1);
    expect(result.has("2")).toBe(true);
  });

  it("应该处理空匹配集合", () => {
    const matchedIds = new Set<string>();
    const result = collectMatchedSubtrees(matchedIds, testRows);

    expect(result.size).toBe(0);
  });

  it("应该避免重复收集节点", () => {
    // 匹配父节点和子节点
    const matchedIds = new Set(["1", "2"]); // A 和 A1
    const result = collectMatchedSubtrees(matchedIds, testRows);

    // 应该包含 A, A1, A2（A1 不会被重复收集）
    expect(result.size).toBe(3);
    expect(result.has("1")).toBe(true);
    expect(result.has("2")).toBe(true);
    expect(result.has("3")).toBe(true);
  });

  it("应该处理根节点匹配", () => {
    const matchedIds = new Set(["0"]); // 匹配根节点
    const result = collectMatchedSubtrees(matchedIds, testRows);

    // 应该包含所有节点
    expect(result.size).toBe(6);
    expect(result.has("0")).toBe(true);
    expect(result.has("1")).toBe(true);
    expect(result.has("2")).toBe(true);
    expect(result.has("3")).toBe(true);
    expect(result.has("4")).toBe(true);
    expect(result.has("5")).toBe(true);
  });

  it("应该处理不存在的节点ID", () => {
    const matchedIds = new Set(["999"]); // 不存在的ID
    const result = collectMatchedSubtrees(matchedIds, testRows);

    // 只包含不存在的ID（被添加但没有子节点）
    expect(result.size).toBe(1);
    expect(result.has("999")).toBe(true);
  });
});
