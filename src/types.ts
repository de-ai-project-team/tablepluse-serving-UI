export type TabType = 'store' | 'hq' | 'admin';

export type StockoutRisk = 'OUT_OF_STOCK' | 'CRITICAL' | 'HIGH' | 'NORMAL' | 'UNKNOWN';
export type DataQuality = 'ok' | 'degraded';

export interface IngredientItem {
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
  ingredient_name: string;
  recommended_quantity: number;
  unit: string;
  recommended_order_at: string;
}

export interface DashboardData {
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
  millis_behind_latest?: number | null;
  full_restarts_15m?: number;
  downtime_ms?: number | null;
  throttled_15m?: number;
  system_errors_15m?: number;
}

export interface TraceabilityData {
  components: {
    api_gateway?: ComponentStatusInfo;
    kinesis?: ComponentStatusInfo;
    flink?: ComponentStatusInfo;
    dynamodb?: ComponentStatusInfo;
    error?: string;
  };
  reconciliation: {
    latest_status: 'PASS' | 'FAIL' | 'INCONCLUSIVE' | 'unknown';
    latest_window: string | null;
    latest_checked_at: string;
    latest_failed_keys: string[];
    recent: Record<string, number>;
  };
  settlement_timeline: Array<{
    run_id: string;
    at: string;
    store_id: string;
    ingredient_id: string;
    status: 'APPLIED' | 'PENDING' | 'FAILED' | 'GAP';
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
    window_start: string;
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
