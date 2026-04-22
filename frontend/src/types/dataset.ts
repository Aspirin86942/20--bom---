export interface FlatRow {
  id: string;
  parent_id: string;
  level: number;
  code: string;
  name: string;
  attr: string;
  qty_actual: string;
  amount: string;
  // 新增字段
  spec_model: string;
  bom_version: string;
  data_status: string;
  unit: string;
  sub_item_type: string;
  qty_numerator: number;
  qty_denominator: number;
  standard_qty: number;
  currency: string;
  unit_price: number;
  tax_rate: number;
  unit_price_with_tax: number;
  total_price_with_tax: number;
  price_source: string;
  supplier: string;
}

export interface DatasetState {
  datasetId: string;
  rows: FlatRow[];
  subtreeAggregates: Record<string, Record<string, unknown>>;
  errors: Array<Record<string, unknown>>;
  warnings: Array<Record<string, unknown>>;
  loading: boolean;
}

export type ViewMode = "tree" | "table" | "path";

export interface WorkbenchQuerySnapshot {
  search: string;
  materialAttr: string;
  amountMin: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

export interface WorkbenchState {
  viewMode: ViewMode;
  expandLevel: number;
  selectedNodeId: string;
  querySnapshot: WorkbenchQuerySnapshot;
}
