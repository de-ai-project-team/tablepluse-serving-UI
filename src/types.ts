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
