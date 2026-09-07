import { Activity, Database, Server, RefreshCcw, SearchCode } from 'lucide-react';

export function AdminTab() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">System Traceability (Admin)</h1>
          <p className="text-lg text-text-secondary mt-2">데이터 파이프라인 상태 모니터링 및 유실 추적</p>
        </div>
        <div className="text-base font-bold text-text-secondary flex items-center gap-3 bg-surface px-5 py-2.5 rounded-full border border-border transition-colors duration-300">
          <RefreshCcw className="w-5 h-5 animate-spin text-blue-500" /> Live Sync Active
        </div>
      </div>

      {/* Health Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <HealthBadge name="API Gateway" status="healthy" icon={<Server className="w-6 h-6" />} />
        <HealthBadge name="Kinesis Stream" status="healthy" icon={<Activity className="w-6 h-6" />} />
        <HealthBadge name="Flink Processor" status="warning" icon={<RefreshCcw className="w-6 h-6" />} delay="1.2s lag" />
        <HealthBadge name="DynamoDB" status="healthy" icon={<Database className="w-6 h-6" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Reconciliation Timeline */}
        <div className="bg-surface border border-border rounded-2xl p-8 shadow-sm col-span-1 transition-colors duration-300">
          <h3 className="font-bold text-xl mb-8 flex items-center gap-3 text-text-primary">
            <Activity className="w-6 h-6 text-blue-500" />
            5-Min Settlement Timeline
          </h3>
          <div className="space-y-8 relative before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
            
            <TimelineItem time="12:15:00" status="PENDING" id="set_88x2" />
            <TimelineItem time="12:10:00" status="APPLIED" id="set_88x1" />
            <TimelineItem time="12:05:00" status="FAILED" id="set_88x0" error="PostgreSQL Checkpoint Mismatch" />
            <TimelineItem time="12:00:00" status="APPLIED" id="set_87f9" />
            
          </div>
        </div>

        {/* Anomaly Tracker */}
        <div className="bg-surface border border-border rounded-2xl p-8 shadow-sm col-span-1 lg:col-span-2 transition-colors duration-300">
          <h3 className="font-bold text-xl mb-4 flex items-center gap-3 text-warning">
            <SearchCode className="w-6 h-6" />
            Anomaly Tracker: Sequence Gap Recovery
          </h3>
          <p className="text-lg text-text-secondary mb-8 font-medium">최근 FAILED 이벤트(set_88x0)의 역추적 및 자동 보정 흐름</p>
          
          <div className="space-y-6">
            <TraceStep 
              step={1} 
              title="Gap Detected in Kinesis Stream"
              code={`{\n  "event_id": "evt_99320",\n  "expected_seq": 4501,\n  "actual_seq": 4503,\n  "status": "GAP_DETECTED"\n}`}
            />
            <TraceStep 
              step={2} 
              title="PostgreSQL Authoritative Checkpoint Sync"
              code={`SELECT * FROM inventory_events \nWHERE store_id = 'ST-001' AND seq BETWEEN 4501 AND 4502;\n// 2 records fetched`}
            />
            <TraceStep 
              step={3} 
              title="DynamoDB Materialized View Update"
              code={`// Dead-letter Queue Recovery Triggered\nUpdateItem({\n  TableName: "StoreInventory",\n  Key: { store_id: "ST-001", item_id: "ITM-04" },\n  UpdateExpression: "SET qty = :val, version = :v",\n  ... \n})`}
              success
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function HealthBadge({ name, status, icon, delay }: any) {
  const isHealthy = status === 'healthy';
  return (
    <div className={`bg-surface border rounded-2xl p-5 flex flex-col justify-between h-36 transition-colors duration-300 ${isHealthy ? 'border-border' : 'border-warning/50 bg-warning/5'}`}>
      <div className="flex items-center justify-between gap-2">
        <div className={`flex items-center gap-2.5 min-w-0 ${isHealthy ? 'text-text-secondary' : 'text-warning'}`}>
          <div className="shrink-0">{icon}</div>
          <span className="text-sm sm:text-base font-bold truncate">{name}</span>
        </div>
        <div className={`w-3 h-3 rounded-full shrink-0 ${isHealthy ? 'bg-safe shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-warning animate-pulse'}`} />
      </div>
      <div>
        <span className={`text-2xl font-extrabold ${isHealthy ? 'text-text-primary' : 'text-warning'}`}>
          {isHealthy ? 'Healthy' : 'Warning'}
        </span>
        {delay && <p className="text-sm font-bold text-warning/80 mt-1">{delay}</p>}
      </div>
    </div>
  );
}

function TimelineItem({ time, status, id, error }: any) {
  const isApplied = status === 'APPLIED';
  const isFailed = status === 'FAILED';
  const isPending = status === 'PENDING';

  let color = 'bg-border';
  if (isApplied) color = 'bg-safe';
  if (isFailed) color = 'bg-danger';
  if (isPending) color = 'bg-warning';

  return (
    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
      <div className={`flex items-center justify-center w-8 h-8 rounded-full border-[6px] border-surface ${color} absolute left-0 md:left-1/2 -translate-x-1/2 md:translate-x-[-50%] shrink-0 transition-colors duration-300`} />
      <div className="w-[calc(100%-3rem)] md:w-[calc(50%-3rem)] p-5 rounded-2xl bg-background border border-border shadow-sm ml-12 md:ml-0 transition-colors duration-300 break-words">
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <span className="text-sm sm:text-base font-extrabold text-text-secondary">{time}</span>
          <span className={`text-xs sm:text-sm font-bold px-3 py-1 rounded-lg shrink-0 ${
            isApplied ? 'bg-safe/10 text-safe' : 
            isFailed ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'
          }`}>{status}</span>
        </div>
        <div className="text-sm sm:text-base font-mono text-text-secondary font-semibold break-all">ID: {id}</div>
        {error && <div className="text-sm sm:text-base text-danger mt-3 font-bold break-words">{error}</div>}
      </div>
    </div>
  );
}

function TraceStep({ step, title, code, success }: any) {
  return (
    <div className="flex gap-4 sm:gap-5">
      <div className="flex flex-col items-center">
        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-base font-bold shrink-0 transition-colors duration-300 ${success ? 'bg-safe/20 text-safe' : 'bg-border text-text-primary'}`}>
          {step}
        </div>
        <div className="flex-1 w-0.5 bg-border my-2 transition-colors duration-300" />
      </div>
      <div className="flex-1 pb-4 min-w-0">
        <h4 className="text-base sm:text-lg font-bold text-text-primary mb-3 break-words">{title}</h4>
        <pre className="bg-[#0f1115] border border-[#22252B] dark:border-border rounded-xl p-4 sm:p-5 text-xs sm:text-[14px] leading-relaxed font-mono text-gray-300 overflow-x-auto shadow-sm whitespace-pre-wrap break-all">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}
