import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, Check, Clock, PackageSearch, RefreshCw, TrendingUp, 
  ShieldAlert, AlertCircle, CheckCircle2, HelpCircle 
} from 'lucide-react';
import { DashboardData, StockoutRisk } from '../../types';

// Mock initial API response based on user prompt schema
const initialMockData: DashboardData = {
  store_name: "테스트 매장 (강남점)",
  updated_at: new Date().toISOString(),
  sales: {
    today_order_count: 122,
    today_sales_amount: 1936700,
    recent_order_count_5m: 8
  },
  menus: [
    { menu_name: "치킨파스타", quantity_sold: 67, order_count: 57, sales_amount: 938000 },
    { menu_name: "스테이크 샐러드", quantity_sold: 42, order_count: 38, sales_amount: 756000 },
    { menu_name: "아보카도 명란 비빔밥", quantity_sold: 29, order_count: 27, sales_amount: 377000 },
    { menu_name: "연어 포케 샐러드", quantity_sold: 18, order_count: 16, sales_amount: 288000 },
    { menu_name: "마르가리타 피자", quantity_sold: 12, order_count: 12, sales_amount: 216000 }
  ],
  ingredients: [
    {
      ingredient_name: "닭가슴살",
      current_quantity: 24800,
      unit: "g",
      data_quality: "ok",
      consumption_rate_per_hour: 3100,
      expected_depletion_at: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
      last_receipt_at: null,
      stockout_risk: "HIGH"
    },
    {
      ingredient_name: "소고기 등심",
      current_quantity: 4500,
      unit: "g",
      data_quality: "degraded",
      consumption_rate_per_hour: 1800,
      expected_depletion_at: new Date(Date.now() + 2.5 * 3600 * 1000).toISOString(),
      last_receipt_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
      stockout_risk: "CRITICAL"
    },
    {
      ingredient_name: "후레쉬 아보카도",
      current_quantity: 8200,
      unit: "g",
      data_quality: "ok",
      consumption_rate_per_hour: 900,
      expected_depletion_at: new Date(Date.now() + 9 * 3600 * 1000).toISOString(),
      last_receipt_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      stockout_risk: "NORMAL"
    },
    {
      ingredient_name: "모짜렐라 치즈",
      current_quantity: 0,
      unit: "g",
      data_quality: "ok",
      consumption_rate_per_hour: 1200,
      expected_depletion_at: null,
      last_receipt_at: null,
      stockout_risk: "OUT_OF_STOCK"
    },
    {
      ingredient_name: "양상추 / 베이비채소",
      current_quantity: 35000,
      unit: "g",
      data_quality: "ok",
      consumption_rate_per_hour: 500,
      expected_depletion_at: new Date(Date.now() + 20 * 3600 * 1000).toISOString(),
      last_receipt_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
      stockout_risk: "NORMAL"
    }
  ],
  reorder: [
    {
      ingredient_name: "소고기 등심",
      recommended_quantity: 12000,
      unit: "g",
      recommended_order_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    },
    {
      ingredient_name: "닭가슴살",
      recommended_quantity: 15000,
      unit: "g",
      recommended_order_at: new Date(Date.now() + 90 * 60 * 1000).toISOString()
    },
    {
      ingredient_name: "모짜렐라 치즈",
      recommended_quantity: 10000,
      unit: "g",
      recommended_order_at: new Date(Date.now() - 10 * 60 * 1000).toISOString()
    }
  ]
};

export function StoreTab() {
  const [data, setData] = useState<DashboardData>(initialMockData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Real REST API GET /dashboard with 15s polling and no-store
  const fetchDashboardData = async (isManual = false) => {
    if (isManual) setIsLoading(true);
    try {
      const res = await fetch('/api/dashboard', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-store'
        }
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const json: DashboardData = await res.json();
      setData(json);
      setLastRefreshed(new Date());
      setError(null);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError("연결 불안정 (마지막 성공 데이터 표시 중)");
    } finally {
      if (isManual) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(false);
    const interval = setInterval(() => {
      fetchDashboardData(false);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Helper for risk badge styling and icon
  const getRiskBadgeConfig = (risk: StockoutRisk) => {
    switch (risk) {
      case 'OUT_OF_STOCK':
        return { label: '품절 (OUT OF STOCK)', bg: 'bg-black text-white dark:bg-zinc-900 dark:text-zinc-100 border-zinc-700', icon: ShieldAlert };
      case 'CRITICAL':
        return { label: '심각 (CRITICAL)', bg: 'bg-red-600 text-white border-red-700 animate-pulse', icon: AlertTriangle };
      case 'HIGH':
        return { label: '위험 (HIGH)', bg: 'bg-amber-600 text-white border-amber-700', icon: AlertTriangle };
      case 'NORMAL':
        return { label: '안정 (NORMAL)', bg: 'bg-emerald-600 text-white border-emerald-700', icon: CheckCircle2 };
      case 'UNKNOWN':
      default:
        return { label: '미확인 (UNKNOWN)', bg: 'bg-slate-500 text-white border-slate-600', icon: HelpCircle };
    }
  };

  const sales = data?.sales || { today_order_count: null, today_sales_amount: null, recent_order_count_5m: null };
  const menus = data?.menus || [];
  const ingredients = data?.ingredients || [];
  const reorder = data?.reorder || [];

  function needData(val: any, formatter?: (v: any) => string) {
    if (val === null || val === undefined || val === '' || Number.isNaN(val)) {
      return <span className="text-amber-500 font-bold text-sm bg-amber-500/10 px-2 py-0.5 rounded">데이터 필요</span>;
    }
    return formatter ? formatter(val) : val.toLocaleString();
  }

  // Sort ingredients by risk severity
  const riskOrder: Record<StockoutRisk, number> = {
    OUT_OF_STOCK: 0,
    CRITICAL: 1,
    HIGH: 2,
    NORMAL: 3,
    UNKNOWN: 4
  };

  const sortedIngredients = [...ingredients].sort((a, b) => {
    return (riskOrder[a.stockout_risk] ?? 4) - (riskOrder[b.stockout_risk] ?? 4);
  });

  // Filter reorder items (위험도 HIGH 이상 재료만)
  const highRiskIngredients = ['OUT_OF_STOCK', 'CRITICAL', 'HIGH'];
  const filteredReorderItems = reorder.filter(item => {
    const matchedIng = ingredients.find(ing => ing.ingredient_name === item.ingredient_name);
    return matchedIng && highRiskIngredients.includes(matchedIng.stockout_risk);
  });

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 pb-12">
      {/* Top Fixed Header Bar */}
      <div className="sticky top-0 z-20 backdrop-blur-md bg-background/80 border-b border-border py-4 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-3.5 h-3.5 rounded-full bg-blue-500 animate-ping" />
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">{data.store_name} 실시간 관제</h1>
              {data._meta && (
                <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-500/10 text-blue-500 border border-blue-500/30">
                  재고 {data._meta.ingredients_settled}/{data._meta.ingredients_total} 정산됨
                </span>
              )}
            </div>
            <p className="text-sm text-text-secondary">점주용 스마트 재고 및 발주 대시보드</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-surface border border-border px-4 py-2 rounded-2xl shadow-sm self-start sm:self-auto">
          <span className="text-sm font-semibold text-text-secondary">
            마지막 갱신: <strong className="text-text-primary">
              {Math.floor((new Date().getTime() - lastRefreshed.getTime()) / 60000)}분 전
            </strong>
          </span>
          <button 
            onClick={() => fetchDashboardData(true)}
            disabled={isLoading}
            className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors flex items-center gap-1"
            title="새로고침"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-500' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-4 rounded-2xl text-center font-bold">
          {error}
        </div>
      )}

      {/* 2-Column Grid on Desktop for Sections */}
      <div className="space-y-8">

        {/* SECTION 1 — 오늘 매출 (Summary Cards 3x horizontal) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-extrabold text-text-primary flex items-center gap-2.5">
              <TrendingUp className="w-6 h-6 text-blue-500" />
              1. 오늘 매출 및 주문 요약
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 카드 1: 오늘 주문 수 */}
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-lg shadow-black/5 flex flex-col justify-between h-40 transition-all hover:border-blue-500/40">
              <p className="text-sm font-bold text-text-secondary uppercase tracking-wider">오늘 주문 수</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl lg:text-5xl font-extrabold text-text-primary">
                  {needData(sales.today_order_count, (v) => v.toLocaleString())}
                </span>
                <span className="text-lg text-text-secondary font-bold">건</span>
              </div>
              <p className="text-xs text-text-secondary">실시간 누적 집계</p>
            </div>

            {/* 카드 2: 오늘 매출 */}
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-lg shadow-black/5 flex flex-col justify-between h-40 transition-all hover:border-emerald-500/40">
              <p className="text-sm font-bold text-text-secondary uppercase tracking-wider">오늘 매출</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl lg:text-4xl font-extrabold text-text-primary">
                  {sales.today_sales_amount !== null && sales.today_sales_amount !== undefined ? `₩${sales.today_sales_amount.toLocaleString()}` : <span className="text-amber-500 font-bold text-sm bg-amber-500/10 px-2 py-0.5 rounded">데이터 필요</span>}
                </span>
              </div>
              <p className="text-xs text-emerald-500 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 결제 완료 기준
              </p>
            </div>

            {/* 카드 3: 최근 5분 주문 */}
            <div className={`bg-surface border rounded-2xl p-6 shadow-lg shadow-black/5 flex flex-col justify-between h-40 transition-all ${
              (sales.recent_order_count_5m ?? 0) > 0 ? 'border-emerald-500/50 bg-emerald-500/[0.02]' : 'border-border'
            }`}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-text-secondary uppercase tracking-wider">최근 5분 주문</p>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                  (sales.recent_order_count_5m ?? 0) > 0 ? 'bg-emerald-500/15 text-emerald-500' : 'bg-slate-500/15 text-slate-400'
                }`}>
                  {(sales.recent_order_count_5m ?? 0) > 0 ? '실시간 활기' : '정체'}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl lg:text-5xl font-extrabold ${(sales.recent_order_count_5m ?? 0) > 0 ? 'text-emerald-500' : 'text-text-secondary'}`}>
                  {needData(sales.recent_order_count_5m, (v) => v.toLocaleString())}
                </span>
                <span className="text-lg text-text-secondary font-bold">건</span>
              </div>
              <p className="text-xs text-text-secondary">최근 5분간 접수된 주문</p>
            </div>
          </div>
        </section>


        {/* SECTION 2 — 메뉴별 판매 (Table) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-extrabold text-text-primary flex items-center gap-2.5">
              <PackageSearch className="w-6 h-6 text-blue-500" />
              2. 메뉴별 판매 현황 (매출 순)
            </h2>
          </div>

          <div className="bg-surface border border-border rounded-2xl shadow-lg shadow-black/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface-hover/50 text-text-secondary text-sm uppercase tracking-wider">
                    <th className="py-4 px-6 font-bold">순위 & 메뉴명</th>
                    <th className="py-4 px-6 font-bold text-right">판매 수량</th>
                    <th className="py-4 px-6 font-bold text-right">주문 건수</th>
                    <th className="py-4 px-6 font-bold text-right">매출</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-text-primary">
                  {data.menus.map((menu, index) => {
                    const isTop3 = index < 3;
                    return (
                      <tr 
                        key={menu.menu_name} 
                        className={`transition-colors hover:bg-surface-hover ${isTop3 ? 'bg-blue-500/[0.04]' : ''}`}
                      >
                        <td className="py-4 px-6 font-medium flex items-center gap-3">
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0 ? 'bg-amber-500 text-white' :
                            index === 1 ? 'bg-slate-400 text-white' :
                            index === 2 ? 'bg-amber-700 text-white' : 'bg-surface-hover text-text-secondary'
                          }`}>
                            {index + 1}
                          </span>
                          <span className="font-bold text-base">{menu.menu_name}</span>
                          {isTop3 && (
                            <span className="px-2 py-0.5 bg-blue-500/15 text-blue-500 text-xs font-bold rounded-md">
                              TOP {index + 1}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right font-semibold">{menu.quantity_sold}개</td>
                        <td className="py-4 px-6 text-right font-semibold">{menu.order_count}건</td>
                        <td className="py-4 px-6 text-right font-extrabold text-blue-500">₩{menu.sales_amount.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>


        {/* SECTION 3 — 재료 재고 & 품절 위험 (Card List, sorted by risk highest to lowest) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-extrabold text-text-primary flex items-center gap-2.5">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              3. 재료 재고 & 품절 위험 관제 (위험도 순 정렬)
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {sortedIngredients.map((item) => {
              const badge = getRiskBadgeConfig(item.stockout_risk);
              const RiskIcon = badge.icon;
              const isDegraded = item.data_quality === 'degraded';

              return (
                <div 
                  key={item.ingredient_name}
                  className={`bg-surface border rounded-2xl p-6 shadow-lg shadow-black/5 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all ${
                    item.stockout_risk === 'CRITICAL' || item.stockout_risk === 'OUT_OF_STOCK'
                      ? 'border-2 border-red-500/50 bg-gradient-to-r from-surface to-red-500/[0.03]'
                      : item.stockout_risk === 'HIGH'
                      ? 'border-2 border-amber-500/50 bg-gradient-to-r from-surface to-amber-500/[0.03]'
                      : 'border-border'
                  }`}
                >
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`px-3 py-1 rounded-xl text-sm font-bold flex items-center gap-1.5 border ${badge.bg}`}>
                        <RiskIcon className="w-4 h-4" />
                        {badge.label}
                      </span>
                      <h3 className="text-2xl font-extrabold text-text-primary">{item.ingredient_name}</h3>
                      
                      {isDegraded && (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-500/20 text-slate-400 border border-slate-500/30 flex items-center gap-1" title="실측 기준, 추정치 아님">
                          정산 전 ❓
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm pt-2">
                      <div>
                        <p className="text-text-secondary font-medium">현재 재고</p>
                        <p className="text-xl font-bold text-text-primary mt-0.5">
                          {item.current_quantity !== null && item.current_quantity !== undefined ? `${item.current_quantity.toLocaleString()} ${item.unit}` : '—'}
                        </p>
                      </div>

                      <div>
                        <p className="text-text-secondary font-medium">시간당 소비</p>
                        <p className="text-xl font-bold text-text-primary mt-0.5 flex items-center gap-1">
                          <TrendingUp className="w-4 h-4 text-blue-500" />
                          {item.consumption_rate_per_hour.toLocaleString()} {item.unit}/h
                        </p>
                      </div>

                      <div>
                        <p className="text-text-secondary font-medium">예상 소진 시각</p>
                        <p className="text-xl font-bold text-danger mt-0.5 flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {item.expected_depletion_at ? new Date(item.expected_depletion_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </p>
                      </div>

                      <div>
                        <p className="text-text-secondary font-medium">마지막 입고</p>
                        <p className="text-base font-bold text-text-primary mt-1">
                          {item.last_receipt_at ? new Date(item.last_receipt_at).toLocaleDateString() + ' ' + new Date(item.last_receipt_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '입고 이력 없음'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>


        {/* SECTION 4 — 발주 추천 (위험도 HIGH 이상 재료만) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-extrabold text-text-primary flex items-center gap-2.5">
              <PackageSearch className="w-6 h-6 text-red-500" />
              4. 긴급 발주 추천 (위험도 HIGH 이상)
            </h2>
          </div>

          {filteredReorderItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredReorderItems.map((reorder) => (
                <div key={reorder.ingredient_name} className="bg-surface border border-red-500/30 rounded-2xl p-6 shadow-md flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-500/15 text-red-500">발주 시급</span>
                    <h3 className="text-xl font-bold text-text-primary">{reorder.ingredient_name}</h3>
                    <p className="text-text-secondary text-sm">
                      추천 발주량: <strong className="text-text-primary">{reorder.recommended_quantity.toLocaleString()} {reorder.unit}</strong>
                    </p>
                    <p className="text-xs text-text-secondary">
                      기한: {new Date(reorder.recommended_order_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 까지
                    </p>
                  </div>

                  <button className="bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-3 rounded-xl shadow-md transition-transform active:scale-95 shrink-pointer">
                    발주 승인
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-2xl p-12 text-center text-text-secondary font-medium">
              지금 발주할 재료가 없습니다. (모든 재고 안정 상태)
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
