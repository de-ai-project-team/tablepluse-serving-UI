export type TabType = 'store' | 'hq' | 'admin';

export type StockoutRisk = 'OUT_OF_STOCK' | 'CRITICAL' | 'HIGH' | 'NORMAL' | 'UNKNOWN';
export type DataQuality = 'ok' | 'degraded';

export interface IngredientItem {
  ingredient_id: string;
  ingredient_name: string;
  current_quantity: number;
  unit: string;
  data_quality: DataQuality;
  consumption_rate_per_hour: number;
  expected_depletion_at: string | null;
  last_receipt_at: string | null;
  stockout_risk: StockoutRisk;
}

export interface MenuItem {
  menu_name: string;
  quantity_sold: number;
  order_count: number;
  sales_amount: number;
}

export interface ReorderItem {
  ingredient_id: string;
  ingredient_name: string;
  recommended_quantity: number;
  unit: string;
  recommended_order_at: string;
}

export type PurchaseOrderStatus = 'ORDERED' | 'RECEIVED';

export interface PurchaseOrder {
  purchase_order_id: string;
  ingredient_id: string;
  ordered_quantity: string;
  status: PurchaseOrderStatus;
  received_at: string | null;
}

export interface DashboardData {
  store_id: string;
  store_name: string;
  updated_at: string;
  sales: {
    today_order_count: number;
    today_sales_amount: number;
    recent_order_count_5m: number;
  };
  menus: MenuItem[];
  ingredients: IngredientItem[];
  reorder: ReorderItem[];
  purchase_orders: PurchaseOrder[];
  _meta?: {
    ingredients_settled: number;
    ingredients_total: number;
  };
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export interface ComponentStatusInfo {
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  requests_15m?: number;
  errors_5xx_15m?: number;
  iterator_age_ms?: number | null;
  put_failed_15m?: number;
  firehose_read_records_15m?: number;
  firehose_read_bytes_15m?: number;
  flink_read_records_15m?: number;
  flink_read_bytes_15m?: number;
  millis_behind_latest?: number | null;
  events_millis_behind_latest?: number | null;
  settlement_millis_behind_latest?: number | null;
  source_records_15m?: number;
  source_bytes_15m?: number;
  last_source_activity_at?: string | null;
  full_restarts_15m?: number;
  downtime_ms?: number | null;
  throttled_15m?: number;
  system_errors_15m?: number;
  incoming_records_15m?: number;
  incoming_bytes_15m?: number;
  last_activity_at?: string | null;
  last_request_at?: string | null;
  last_metric_at?: string | null;
  delivered_records_15m?: number;
  delivery_success?: number | boolean | string | null;
  data_freshness_seconds?: number | null;
  last_delivery_at?: string | null;
  writes_15m?: number;
  last_write_metric_at?: string | null;
}

export interface BronzeS3Info {
  status?: 'healthy' | 'warning' | 'critical' | 'unknown' | string;
  lookback_hours?: number | null;
  last_object_at?: string | null;
  last_object_key?: string | null;
  last_object_size_bytes?: number | null;
  error?: string | null;
}

export interface BatchPhase {
  phase?: string;
  status?: string;
  processing_run_id?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  duration_seconds?: number | null;
  target_date?: string | null;
  counts?: Record<string, number> | null;
  error?: string | null;
}

export interface BatchExecution {
  execution_id?: string;
  status?: string;
  target_date?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  processing_run_ids?: string[];
  phases?: BatchPhase[];
  error?: string | null;
}

export interface BatchInfo {
  status?: string;
  last_execution?: BatchExecution | null;
  last_successful_execution?: BatchExecution | null;
  last_failed_execution?: BatchExecution | null;
  recent_executions?: BatchExecution[];
}

export interface ServingStateInfo {
  status?: string;
  store_id?: string;
  observed_at?: string | null;
  inventory?: Record<string, unknown>;
  sales?: Record<string, unknown>;
  menu?: Record<string, unknown>;
}

export interface TraceabilityData {
  components: {
    observed_at?: string | null;
    window_minutes?: number | null;
    api_gateway?: ComponentStatusInfo;
    kinesis?: ComponentStatusInfo;
    settlement_kinesis?: ComponentStatusInfo;
    firehose?: ComponentStatusInfo;
    flink?: ComponentStatusInfo;
    dynamodb?: ComponentStatusInfo;
    error?: string;
  };
  bronze_s3?: BronzeS3Info;
  batch?: BatchInfo;
  serving_state?: ServingStateInfo;
  reconciliation: {
    latest_status: 'PASS' | 'FAIL' | 'INCONCLUSIVE' | 'unknown';
    latest_window: string | null;
    latest_checked_at: string | null;
    latest_failed_keys: string[];
    recent: Record<string, number>;
  };
  settlement_timeline: Array<{
    run_id: string;
    at: string | null;
    store_id: string;
    ingredient_id: string;
    status: 'APPLIED' | 'PENDING' | 'FAILED' | 'GAP' | 'RESOLVED';
    resolution?: 'later_settlement' | string | null;
    resolved_by_run_id?: string | null;
    prev_settled_sequence: number | null;
    settled_sequence: number | null;
    settled_quantity: string | null;
    settlement_version: number | null;
    conflict: boolean;
    verify?: { resolved: boolean; expected_settled_sequence: number; observed_settled_sequence: number } | null;
    reasons?: string[];
  }>;
  anomaly_recoveries: Array<{
    run_id: string;
    detected_at: string;
    store_id: string;
    ingredient_id: string;
    window_start: string | null;
    anomaly_type: string;
    escalate: boolean;
    step1_detect: {
      reasons: string[];
      observed: Record<string, any>;
      expected: Record<string, any>;
      safe_cutoff_hint?: number | null;
    };
    step2_compute_correction: {
      source: string;
      prev_settled_sequence: number;
      safe_contiguous_cutoff: number;
      settled_quantity: string;
      settlement_version: number;
      source_event_ids: string[];
      conflict: boolean;
    } | null;
    step3_apply: {
      target: string;
      expected_settled_sequence: number;
      expected_settlement_version: number;
      observed_settled_sequence: number;
      observed_settlement_version: number;
      resolved: boolean;
      resolution?: 'later_settlement' | string | null;
      resolved_by_run_id?: string | null;
    } | null;
    superseding_settlement?: {
      run_id: string;
      settled_sequence: number;
      settled_quantity: string;
      settlement_version: number;
      emitted_at: string;
    } | null;
    outcome: string;
  }>;
  _meta?: {
    lookback_days: number;
    ops_docs: {
      reconciliation_result: number;
      data_quality_anomaly: number;
      settlement_history: number;
    };
  };
}
