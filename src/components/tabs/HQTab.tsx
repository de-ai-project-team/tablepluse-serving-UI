import { MapPin, TrendingUp, AlertCircle, BarChart3 } from 'lucide-react';

export function HQTab() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary tracking-tight">전사 매장 관제 (HQ)</h1>
        <p className="text-lg text-text-secondary mt-2">지역별 매장 상태 및 소비 트렌드 통합 요약</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm col-span-1 lg:col-span-1 transition-colors duration-300">
          <div className="flex items-center gap-3 text-danger mb-6">
            <AlertCircle className="w-7 h-7" />
            <h3 className="font-bold text-lg">품절 위험 매장</h3>
          </div>
          <div className="text-6xl font-extrabold mb-3 text-text-primary">12<span className="text-2xl font-bold text-text-secondary ml-1">개소</span></div>
          <p className="text-lg text-text-secondary font-medium">전체 매장의 4.2%</p>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-8 shadow-sm col-span-1 lg:col-span-3 transition-colors duration-300">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3 text-text-primary">
              <TrendingUp className="w-7 h-7 text-blue-500" />
              <h3 className="font-bold text-xl">오늘의 핵심 트렌드 (실시간)</h3>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <TrendCard 
               region="서울/강남권"
               insight="샐러드류 주문 +35% 급증"
               action="야채류 추가 발주 권고 알림 발송 완료"
               status="warning"
             />
             <TrendCard 
               region="경기/판교권"
               insight="평시 대비 안정적인 재고 소진율"
               action="특이사항 없음"
               status="safe"
             />
             <TrendCard 
               region="부산/해운대권"
               insight="닭가슴살 재고 부족 현상 다수"
               action="인근 물류센터 긴급 배송 조율 중"
               status="danger"
             />
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-2xl p-8 shadow-sm min-h-[500px] flex flex-col transition-colors duration-300">
        <div className="flex items-center gap-3 text-text-primary mb-8">
          <BarChart3 className="w-7 h-7" />
          <h3 className="font-bold text-xl">지역별 주요 식자재 소비 추이</h3>
        </div>
        
        <div className="flex-1 border-2 border-dashed border-border rounded-xl flex items-center justify-center bg-background/50 transition-colors duration-300">
          <div className="text-center">
            <div className="flex justify-center mb-5 text-text-secondary/50">
               <BarChart3 className="w-20 h-20" />
            </div>
            <p className="text-xl font-bold text-text-secondary">D3.js / Recharts 렌더링 영역</p>
            <p className="text-base text-text-secondary/60 mt-3 font-medium">HQ 권한의 데이터 패치가 완료되면 표시됩니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrendCard({ region, insight, action, status }: any) {
  const statusColors = {
    danger: 'bg-danger/10 text-danger border-danger/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    safe: 'bg-safe/10 text-safe border-safe/20',
  };

  const statusColor = statusColors[status as keyof typeof statusColors];

  return (
    <div className="bg-background rounded-xl p-6 border border-border shadow-sm transition-colors duration-300 flex flex-col justify-between">
       <div className="flex items-center gap-2 mb-4">
         <MapPin className="w-6 h-6 text-text-secondary" />
         <span className="font-bold text-lg text-text-primary">{region}</span>
       </div>
       <div className="space-y-4">
         <p className="text-lg font-bold text-text-primary leading-snug">{insight}</p>
         <div className={`text-sm px-4 py-2.5 rounded-lg border font-bold ${statusColor}`}>
           {action}
         </div>
       </div>
    </div>
  );
}
