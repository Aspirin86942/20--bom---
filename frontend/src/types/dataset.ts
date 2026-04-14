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
