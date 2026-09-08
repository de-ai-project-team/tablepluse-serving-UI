import { useEffect, useMemo, useState } from 'react';
import {
  Background,
  Controls,
  Edge,
  Handle,
  MarkerType,
  Node,
  NodeProps,
  Position,
  ReactFlow,
  ViewportPortal,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Activity, AlertTriangle, CheckCircle2, Clock3, X } from 'lucide-react';
import { ComponentStatusInfo, ServingStateInfo, TraceabilityData } from '../../types';
import {
  createPipelineOperationsModel,
  derivePipelineAreaHealth,
  PipelineHealth,
  PipelineNode,
  PipelineNodeId,
} from '../../lib/traceabilityAdapter';

type PipelineNodeData = PipelineNode & Record<string, unknown> & { selected: boolean; onSelect: (id: PipelineNodeId) => void };
type PipelineFlowNode = Node<PipelineNodeData, 'pipeline'>;

const positions: Record<PipelineNodeId, { x: number; y: number }> = {
  'restaurant-events-kinesis': { x: 40, y: 20 },
  flink: { x: 360, y: 20 },
  dynamodb: { x: 680, y: 20 },
  firehose: { x: 360, y: 270 },
  bronze: { x: 680, y: 270 },
  batch: { x: 1000, y: 270 },
  reconciliation: { x: 680, y: 545 },
  'settlement-kinesis': { x: 1000, y: 545 },
};

const nodeTypes = { pipeline: PipelineNodeView };

const statusMeta: Record<PipelineHealth, { label: string; color: string; dot: string }> = {
  healthy: { label: 'HEALTHY', color: 'text-emerald-500', dot: 'bg-emerald-500' },
  degraded: { label: 'DEGRADED', color: 'text-amber-500', dot: 'bg-amber-500' },
  error: { label: 'ERROR', color: 'text-red-500', dot: 'bg-red-500' },
  unknown: { label: 'UNKNOWN', color: 'text-slate-400', dot: 'bg-slate-400' },
};

export function PipelineArchitectureMap({
  data,
  selectedNodeId,
  onSelectNode,
  highlightedRunId,
  onSelectRecoveryRun,
}: {
  data: TraceabilityData | null;
  selectedNodeId: PipelineNodeId;
  onSelectNode: (id: PipelineNodeId) => void;
  highlightedRunId?: string | null;
  onSelectRecoveryRun?: (runId: string) => void;
}) {
  const model = useMemo(() => createPipelineOperationsModel(data || emptyTraceability()), [data]);
  const areas = useMemo(() => derivePipelineAreaHealth(data || emptyTraceability()), [data]);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [recoveryExpanded, setRecoveryExpanded] = useState(false);
  useEffect(() => {
    if (selectedNodeId !== 'reconciliation') setRecoveryExpanded(false);
  }, [selectedNodeId]);

  const flowNodes = useMemo<PipelineFlowNode[]>(() => model.nodes.map(node => ({
    id: node.id,
    type: 'pipeline',
    position: positions[node.id],
    draggable: false,
    data: { ...node, selected: selectedNodeId === node.id, onSelect: (id: PipelineNodeId) => { onSelectNode(id); setDrawerOpen(true); } },
  })), [model, selectedNodeId, onSelectNode]);

  const flowEdges = useMemo<Edge[]>(() => model.edges.map((edge, index) => ({
    id: `${edge.from}-${edge.to}-${index}`,
    source: edge.from,
    target: edge.to,
    type: 'smoothstep',
    label: edge.label,
    animated: edge.from === selectedNodeId || edge.to === selectedNodeId,
    style: { stroke: edge.from === selectedNodeId || edge.to === selectedNodeId ? '#60a5fa' : edge.kind === 'dependency' ? '#cbd5e1' : '#94a3b8', strokeWidth: edge.from === selectedNodeId || edge.to === selectedNodeId ? 2.5 : edge.kind === 'dependency' ? 1 : 1.5, strokeDasharray: edge.kind === 'correction' ? '7 5' : edge.kind === 'dependency' ? '2 5' : undefined },
    labelStyle: { fill: '#64748b', fontWeight: 700, fontSize: 11 },
    labelBgStyle: { fill: 'var(--color-surface, #fff)', fillOpacity: 0.9 },
    markerEnd: { type: MarkerType.ArrowClosed, color: edge.from === selectedNodeId || edge.to === selectedNodeId ? '#60a5fa' : '#94a3b8' },
  })), [model, selectedNodeId]);

  const [nodes, , onNodesChange] = useNodesState(flowNodes);
  const [edges, , onEdgesChange] = useEdgesState(flowEdges);
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);
  // Dynamic data updates should refresh node contents without touching fixed layout.
  const renderedNodes = nodes.map(node => {
    const latest = flowNodes.find(next => next.id === node.id);
    return latest ? { ...node, data: latest.data } : node;
  });
  const renderedEdges = edges.map(edge => flowEdges.find(next => next.id === edge.id) || edge);
  const selected = model.nodes.find(node => node.id === selectedNodeId) || model.nodes[0];

  return (
    <section className="space-y-4">
      <div className="relative">
      <div className="bg-surface border border-border rounded-3xl p-5 sm:p-7 shadow-sm overflow-hidden w-full">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-5">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-blue-500" />
              <h2 className="text-xl sm:text-2xl font-extrabold text-text-primary">Pipeline Operations</h2>
            </div>
          <div className="flex flex-wrap gap-2 text-[11px] font-bold uppercase">
            {Object.entries({ Realtime: areas.realtime, Historical: areas.historical, Correctness: areas.correctness, Serving: areas.serving }).map(([label, status]) => (
              <span key={label} className={`px-2.5 py-1 rounded-full bg-background border border-border ${statusMeta[status].color}`}>
                <i className={`inline-block w-1.5 h-1.5 rounded-full ${statusMeta[status].dot} mr-1.5`} />{label} · {statusMeta[status].label}
              </span>
            ))}
          </div>
        </div>
        <div className="text-xs text-text-secondary mb-3 flex flex-wrap gap-x-4 gap-y-1">
          <span className="ml-auto">{data?.components.observed_at ? `Last updated ${formatTime(data.components.observed_at)}` : 'Operational data loading'}</span>
        </div>
        <div className="pipeline-map relative h-[820px] min-w-[1120px] rounded-2xl border border-border/70 bg-gradient-to-br from-blue-500/[0.04] via-transparent to-amber-500/[0.04] overflow-hidden">
          <ReactFlow className="relative z-10" nodes={renderedNodes} edges={renderedEdges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onNodeClick={(_, node) => { onSelectNode(node.id as PipelineNodeId); setDrawerOpen(true); }} onPaneClick={() => setDrawerOpen(false)} fitView fitViewOptions={{ padding: 0.12, minZoom: 0.55, maxZoom: 1.1 }} proOptions={{ hideAttribution: true }}>
            <ViewportPortal>
              <div className="pointer-events-none absolute left-0 top-0 w-[2150px] h-[820px] text-[10px] font-black tracking-[0.22em] text-text-secondary/70 uppercase">
                <div className="absolute inset-x-0 top-0 h-[270px] border-b border-blue-500/10 bg-blue-500/[0.025] px-5 pt-4">Realtime</div>
                <div className="absolute inset-x-0 top-[270px] h-[275px] border-b border-amber-500/10 bg-amber-500/[0.025] px-5 pt-4">History / Batch</div>
                <div className="absolute inset-x-0 top-[545px] bottom-0 bg-emerald-500/[0.025] px-5 pt-4">Correct / Recover</div>
              </div>
            </ViewportPortal>
            <Background color="#94a3b8" gap={24} size={1} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
        <p className="text-[11px] text-text-secondary mt-3">노드를 드래그해 배치할 수 있습니다. 위치는 polling 중에도 유지됩니다.</p>
      </div>
      {drawerOpen && selected && (
        <aside className={`mt-4 xl:mt-0 xl:fixed xl:right-6 xl:top-24 xl:z-40 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto bg-surface/95 backdrop-blur border border-blue-500/30 rounded-2xl shadow-2xl p-6 relative animate-in fade-in slide-in-from-right-2 duration-200 transition-[width] ${selected.id === 'reconciliation' && recoveryExpanded ? 'xl:w-[1200px]' : selected.id === 'dynamodb' ? 'xl:w-[760px]' : selected.id === 'batch' ? 'xl:w-[640px]' : 'xl:w-[360px]'}`}>
          <button type="button" aria-label="상세 닫기" onClick={() => setDrawerOpen(false)} className="absolute right-4 top-4 p-1.5 rounded-lg text-text-secondary hover:bg-background"><X className="w-4 h-4" /></button>
          <div className="flex items-start gap-3 pr-8">
            <div className={`mt-1 w-2.5 h-2.5 rounded-full ${statusMeta[selected.healthStatus].dot}`} />
            <div><h3 className="text-lg font-extrabold text-text-primary">{selected.title}</h3><p className="text-xs text-text-secondary">{selected.subtitle}</p></div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs font-extrabold"><span className={statusMeta[selected.healthStatus].color}>{statusMeta[selected.healthStatus].label}</span>{selected.activityStatus && <span className="text-text-secondary">· {selected.activityStatus === 'idle' ? 'IDLE' : selected.activityStatus.toUpperCase()}</span>}</div>
          <div className="grid sm:grid-cols-2 gap-3 mt-5">{selected.metrics.map(metric => <div key={metric.label} className="rounded-xl bg-background border border-border px-4 py-3"><p className="text-xs text-text-secondary">{metric.label}</p><p className="mt-1 text-sm font-bold text-text-primary break-all">{metric.value}{metric.unit ? ` ${metric.unit}` : ''}</p></div>)}</div>
          {selected.detail && ['restaurant-events-kinesis', 'firehose', 'flink', 'dynamodb', 'settlement-kinesis'].includes(selected.id) && <ComponentDetails nodeId={selected.id} detail={selected.detail as ComponentStatusInfo} />}
          {selected.id === 'dynamodb' && <ServingStateDetails servingState={data?.serving_state} />}
          {selected.lastActivityAt && <p className="mt-4 text-xs text-text-secondary flex items-center gap-2"><Clock3 className="w-3.5 h-3.5" />Last activity · {formatTime(selected.lastActivityAt)}</p>}
          {selected.healthStatus === 'unknown' && <p className="mt-4 text-xs text-text-secondary flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5 text-slate-400" />최근 데이터 없음 / 새 이벤트 대기 중</p>}
          {selected.id === 'bronze' && typeof selected.detail === 'object' && selected.detail !== null && <BronzeDetails detail={selected.detail as Record<string, unknown>} />}
          {selected.id === 'batch' && typeof selected.detail === 'object' && selected.detail !== null && <BatchDetails detail={selected.detail as Record<string, any>} />}
          {selected.id === 'reconciliation' && <RecoveryPreview data={data} selectedRunId={highlightedRunId} onSelectRun={onSelectRecoveryRun} expanded={recoveryExpanded} onToggleExpanded={() => setRecoveryExpanded(value => !value)} />}
        </aside>
      )}
      </div>
    </section>
  );
}

function PipelineNodeView({ data }: NodeProps<PipelineFlowNode>) {
  const status = statusMeta[data.healthStatus];
  return <>
    <Handle type="target" position={Position.Left} className="!bg-slate-400 !border-0 !w-2 !h-2" />
    <button type="button" onClick={() => data.onSelect(data.id)} className={`w-[220px] text-left rounded-2xl border bg-surface/95 backdrop-blur p-4 shadow-lg transition-all ${data.selected ? 'border-blue-500 ring-4 ring-blue-500/20 -translate-y-0.5' : 'border-border hover:border-blue-400/70'}`}>
      <div className="flex items-start justify-between gap-2"><div><p className="text-[10px] uppercase tracking-[0.16em] text-text-secondary font-bold">{data.subtitle}</p><h3 className="mt-1 text-base font-extrabold text-text-primary">{data.title}</h3></div><span className={`flex items-center gap-1 text-[10px] font-black ${status.color}`}><i className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />{status.label}</span></div>
      <div className="mt-3 space-y-1">{data.metrics.slice(0, 2).map(metric => <div key={metric.label} className="flex justify-between gap-2 text-xs"><span className="text-text-secondary">{metric.label}</span><span className="font-bold text-text-primary truncate">{metric.value}{metric.unit ? ` ${metric.unit}` : ''}</span></div>)}</div>
      {data.phaseSummary && <div className="mt-2 flex flex-wrap gap-1">{data.phaseSummary.slice(0, 3).map(phase => <span key={phase.name} className="rounded bg-background border border-border px-1.5 py-0.5 text-[9px] font-bold text-text-secondary">{phase.name} · {phase.status}</span>)}</div>}
      {data.activityStatus === 'idle' && <p className="mt-2 text-[10px] font-bold text-text-secondary">Idle · 정상 대기</p>}
    </button>
    <Handle type="source" position={Position.Right} className="!bg-blue-400 !border-0 !w-2 !h-2" />
  </>;
}

function BronzeDetails({ detail }: { detail: Record<string, unknown> }) {
  return <div className="mt-5 border-t border-border pt-4 space-y-2 text-xs"><p className="font-bold text-text-primary">Bronze object 확인</p><p className="text-text-secondary break-all">{String(detail.last_object_key || '최근 object 없음')}</p><p className="text-text-secondary">{detail.last_object_size_bytes == null ? 'Size —' : `Size ${Number(detail.last_object_size_bytes).toLocaleString()} bytes`}</p></div>;
}

function ComponentDetails({ nodeId, detail }: { nodeId: string; detail: ComponentStatusInfo }) {
  const rows: Array<[string, string]> = nodeId === 'restaurant-events-kinesis' ? [
    ['Input', `${detail.incoming_records_15m ?? '—'} records · ${detail.incoming_bytes_15m ?? '—'} bytes`],
    ['To Firehose', `${detail.firehose_read_records_15m ?? '—'} records · ${detail.firehose_read_bytes_15m ?? '—'} bytes`],
    ['To Flink', `${detail.flink_read_records_15m ?? '—'} records · ${detail.flink_read_bytes_15m ?? '—'} bytes`],
    ['Failed puts', `${detail.put_failed_15m ?? '—'} records`],
    ['Last activity', formatTime(detail.last_activity_at)],
  ] : nodeId === 'firehose' ? [
    ['Read from Kinesis', `${detail.incoming_records_15m ?? '—'} records`],
    ['Delivered to S3', `${detail.delivered_records_15m ?? '—'} records`],
    ['Delivery success', detail.delivery_success == null ? 'No recent delivery' : `${Number(detail.delivery_success) * 100}%`],
    ['Delivery latency', detail.data_freshness_seconds == null ? 'No recent datapoint' : `${detail.data_freshness_seconds} sec`],
    ['Last delivery', formatTime(detail.last_delivery_at)],
  ] : nodeId === 'flink' ? [
    ['Records consumed', `${detail.source_records_15m ?? '—'}`],
    ['Source bytes', `${detail.source_bytes_15m ?? '—'} bytes`],
    ['Input lag', detail.millis_behind_latest == null ? 'No recent datapoint' : `${detail.millis_behind_latest} ms`],
    ['Events lag', detail.events_millis_behind_latest == null ? 'No recent datapoint' : `${detail.events_millis_behind_latest} ms`],
    ['Settlement lag', detail.settlement_millis_behind_latest == null ? 'No recent datapoint' : `${detail.settlement_millis_behind_latest} ms`],
    ['Restarts / 15m', `${detail.full_restarts_15m ?? '—'}`],
    ['Downtime', `${detail.downtime_ms ?? '—'} ms`],
    ['Last source activity', formatTime(detail.last_source_activity_at)],
  ] : nodeId === 'dynamodb' ? [
    ['Write capacity used', `${detail.writes_15m ?? '—'} / 15m`],
    ['Throttled', `${detail.throttled_15m ?? '—'}`],
    ['System errors', `${detail.system_errors_15m ?? '—'}`],
  ] : [
    ['Incoming settlement', `${detail.incoming_records_15m ?? '—'} records · ${detail.incoming_bytes_15m ?? '—'} bytes`],
    ['Failed puts', `${detail.put_failed_15m ?? '—'} records`],
    ['Last activity', formatTime(detail.last_activity_at)],
  ];
  return <div className="mt-5 border-t border-border pt-4"><p className="text-xs font-bold text-text-primary mb-2">Operational details</p><div className="space-y-2">{rows.map(([label, value]) => <div key={label} className="flex justify-between gap-4 text-xs"><span className="text-text-secondary">{label}</span><span className="text-text-primary font-bold text-right">{value}</span></div>)}</div></div>;
}

function ServingStateDetails({ servingState }: { servingState?: ServingStateInfo }) {
  if (!servingState) return <div className="mt-5 border-t border-border pt-4 text-xs text-text-secondary">serving_state 데이터 없음</div>;
  const sales = servingState.sales as Record<string, any> | undefined;
  const menu = servingState.menu as Record<string, any> | undefined;
  const businessDay = typeof sales?.business_day === 'string' ? sales.business_day : undefined;
  const isCurrentBusinessDay = sales?.is_current_business_day === true && menu?.is_current_business_day === true;
  return <div className="mt-5 border-t border-border pt-4 space-y-4"><div className="flex items-center justify-between gap-3"><p className="text-xs font-bold text-text-primary">Serving projection</p><span className={`rounded-md px-2.5 py-1 text-[11px] font-extrabold ${isCurrentBusinessDay ? 'bg-emerald-500/15 text-emerald-500' : 'bg-amber-500/15 text-amber-500'}`}>{isCurrentBusinessDay ? 'CURRENT BUSINESS DAY' : `PREVIOUS BUSINESS DAY${businessDay ? ` · ${businessDay}` : ''}`}</span></div><p className="text-xs text-text-secondary">Inventory는 현재 projection으로 표시합니다. Sales/Menu는 business day 기준으로 구분합니다.</p><pre className="max-h-[420px] overflow-auto rounded-xl border border-border bg-[#0f1115] p-4 text-[11px] leading-5 text-gray-300"><code>{JSON.stringify(servingState, null, 2)}</code></pre></div>;
}

function BatchDetails({ detail }: { detail: Record<string, any> }) {
  const execution = detail.last_execution;
  if (!execution) return <p className="mt-5 border-t border-border pt-4 text-xs text-text-secondary">최근 batch execution 없음</p>;
  return <div className="mt-5 border-t border-border pt-4 space-y-4 text-xs">
    <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4"><p className="font-bold text-text-primary">Last execution</p><p className="mt-2 text-text-secondary break-all">{execution.execution_id || '—'}</p><div className="grid grid-cols-2 gap-3 mt-3"><div><span className="text-text-secondary block">Status</span><strong>{execution.status || 'unknown'}</strong></div><div><span className="text-text-secondary block">Target date</span><strong>{execution.target_date || '—'}</strong></div><div><span className="text-text-secondary block">Started</span><strong>{formatTime(execution.started_at)}</strong></div><div><span className="text-text-secondary block">Finished</span><strong>{formatTime(execution.finished_at)}</strong></div></div>{execution.error && <p className="mt-3 text-red-500 break-all">{execution.error}</p>}</div>
    <div><p className="font-bold text-text-primary mb-2">Processing phases</p><div className="space-y-2">{(execution.phases || []).map((phase: any) => <div key={`${phase.phase}-${phase.processing_run_id || ''}`} className="rounded-xl bg-background border border-border p-4"><div className="flex justify-between gap-2 font-bold"><span>{phase.phase || 'phase'}</span><span className={phase.status === 'FAILED' ? 'text-red-500' : phase.status === 'RUNNING' ? 'text-amber-500' : 'text-emerald-500'}>{phase.status || 'unknown'}</span></div>{phase.processing_run_id && <p className="mt-2 text-text-secondary break-all">Run: {phase.processing_run_id}</p>}<div className="grid grid-cols-2 gap-2 mt-2 text-text-secondary"><span>Duration: {phase.duration_seconds == null ? '—' : `${phase.duration_seconds}s`}</span><span>Target: {phase.target_date || '—'}</span></div>{phase.counts && <pre className="mt-2 rounded-lg bg-surface border border-border/60 p-2 whitespace-pre-wrap break-all">{JSON.stringify(phase.counts, null, 2)}</pre>}{phase.error && <p className="mt-2 text-red-500 break-all">{phase.error}</p>}</div>)}</div></div>
    {(detail.last_successful_execution || detail.last_failed_execution) && <div><p className="font-bold text-text-primary mb-2">Recent outcomes</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{detail.last_successful_execution && <div className="rounded-xl bg-background border border-emerald-500/20 p-3"><span className="text-emerald-500 font-bold">Last successful</span><p className="mt-1 text-text-secondary">{detail.last_successful_execution.target_date || '—'} · {formatTime(detail.last_successful_execution.finished_at)}</p></div>}{detail.last_failed_execution && <div className="rounded-xl bg-background border border-red-500/20 p-3"><span className="text-red-500 font-bold">Last failed</span><p className="mt-1 text-text-secondary">{detail.last_failed_execution.target_date || '—'} · {formatTime(detail.last_failed_execution.finished_at)}</p></div>}</div></div>}
    {Array.isArray(detail.recent_executions) && detail.recent_executions.length > 0 && <div><p className="font-bold text-text-primary mb-2">Recent executions</p><div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="border-b border-border text-text-secondary"><th className="py-2 pr-3">Finished</th><th className="py-2 pr-3">Target</th><th className="py-2">Status</th></tr></thead><tbody>{detail.recent_executions.slice(0, 8).map((item: any) => <tr key={item.execution_id} className="border-b border-border/60"><td className="py-2 pr-3 whitespace-nowrap">{formatTime(item.finished_at)}</td><td className="py-2 pr-3">{item.target_date || '—'}</td><td className="py-2 font-bold">{item.status || 'unknown'}</td></tr>)}</tbody></table></div></div>}
  </div>;
}

function RecoveryPreview({ data, selectedRunId, onSelectRun, expanded, onToggleExpanded }: { data: TraceabilityData | null; selectedRunId?: string | null; onSelectRun?: (runId: string) => void; expanded: boolean; onToggleExpanded: () => void }) {
  const timeline = data?.settlement_timeline || [];
  const anomalies = data?.anomaly_recoveries || [];
  const selectedAnomaly = selectedRunId ? anomalies.find(item => item.run_id === selectedRunId) : undefined;
  return <div className="mt-5 border-t border-border pt-4 space-y-5 text-xs">
    <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 font-bold text-text-secondary">
      Window: {formatWindowRange(data?.reconciliation?.latest_window)} · checked {formatRelative(data?.reconciliation?.latest_checked_at)}
    </div>
    <button type="button" onClick={onToggleExpanded} className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 font-bold text-blue-500 hover:bg-blue-500/20">{expanded ? 'Recovery details 닫기' : `Recovery details 보기 (${timeline.length + anomalies.length})`}</button>
    {expanded && <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
    <div><p className="font-bold text-text-primary mb-3">5-Min Settlement Timeline</p>{timeline.length === 0 ? <p className="text-text-secondary">최근 settlement 없음</p> : <div className="space-y-4 relative before:absolute before:inset-y-0 before:left-3 before:w-0.5 before:bg-border">{timeline.slice(0, 6).map(item => <div key={item.run_id} onClick={() => onSelectRun?.(item.run_id)} className={`relative pl-8 cursor-pointer ${selectedRunId === item.run_id ? 'rounded-xl ring-2 ring-blue-500/40' : ''}`}><div className={`absolute left-0 top-1.5 w-6 h-6 rounded-full border-4 border-surface ${item.status === 'FAILED' ? 'bg-red-500' : item.status === 'PENDING' ? 'bg-amber-500' : 'bg-emerald-500'}`} /><div className="rounded-xl bg-background border border-border p-4 shadow-sm hover:border-blue-500/50"><div className="flex justify-between gap-2 font-bold flex-wrap"><span className="text-text-primary">{item.store_id} · {item.ingredient_id}</span><span className={`px-2.5 py-0.5 rounded-md ${item.status === 'FAILED' ? 'bg-red-500/15 text-red-500' : item.status === 'PENDING' ? 'bg-amber-500/15 text-amber-500' : 'bg-emerald-500/15 text-emerald-500'}`}>{item.status}</span></div><p className="mt-2 text-text-secondary break-all font-mono">{item.run_id}</p><div className="grid grid-cols-3 gap-2 mt-3 text-xs"><div className="bg-surface rounded-lg p-2"><span className="text-text-secondary block">Sequence</span><strong>{item.prev_settled_sequence ?? '—'} → {item.settled_sequence ?? '—'}</strong></div><div className="bg-surface rounded-lg p-2"><span className="text-text-secondary block">Quantity</span><strong>{item.settled_quantity ?? '—'}</strong></div><div className="bg-surface rounded-lg p-2"><span className="text-text-secondary block">Version</span><strong>{item.settlement_version ?? '—'}</strong></div></div>{item.verify && <p className={item.verify.resolved ? 'mt-3 text-emerald-500 font-bold' : 'mt-3 text-amber-500 font-bold'}>✓ ReVerify {item.verify.resolved ? 'PASS' : 'PENDING'}</p>}</div></div>)}</div>}</div>
    <div><p className="font-bold text-text-primary mb-3">Selected Anomaly Tracker</p>{!selectedAnomaly ? <div className="rounded-xl bg-background border border-border p-4 text-text-secondary">선택한 timeline의 <span className="font-mono text-text-primary">{selectedRunId || 'run'}</span>에 연결된 anomaly tracker가 없습니다.</div> : <div className="rounded-xl bg-background border border-border p-4 shadow-sm"><div className="flex justify-between gap-2 font-bold flex-wrap"><span className="text-text-primary">{selectedAnomaly.store_id} · {selectedAnomaly.ingredient_id}</span><span className="px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-500">{selectedAnomaly.outcome}</span></div><p className="mt-2 text-text-secondary break-all font-mono">{selectedAnomaly.run_id}</p><div className="mt-4 space-y-3 relative before:absolute before:inset-y-3 before:left-3 before:w-0.5 before:bg-border"><div className="relative ml-7 rounded-xl border border-border/60 bg-surface p-4 shadow-sm"><span className="absolute -left-10 top-4 flex h-6 w-6 items-center justify-center rounded-full border-4 border-background bg-blue-500 text-[10px] font-black text-white">1</span><strong>Mismatch Detected &amp; Validated</strong><p className="mt-1 text-text-secondary">{selectedAnomaly.anomaly_type}</p><div className="grid grid-cols-2 gap-3 mt-3"><pre className="rounded-lg bg-background border border-border/60 p-3 text-[11px] text-text-primary whitespace-pre-wrap overflow-auto"><strong>Observed</strong>{'\n'}{JSON.stringify(selectedAnomaly.step1_detect.observed, null, 2)}</pre><pre className="rounded-lg bg-background border border-border/60 p-3 text-[11px] text-text-primary whitespace-pre-wrap overflow-auto"><strong>Expected</strong>{'\n'}{JSON.stringify(selectedAnomaly.step1_detect.expected, null, 2)}</pre></div></div><div className="relative ml-7 rounded-xl border border-border/60 bg-surface p-4 shadow-sm"><span className="absolute -left-10 top-4 flex h-6 w-6 items-center justify-center rounded-full border-4 border-background bg-blue-500 text-[10px] font-black text-white">2</span><strong>Compute Targeted Correction</strong><p className="mt-1 text-text-secondary">{selectedAnomaly.step2_compute_correction ? `source: ${selectedAnomaly.step2_compute_correction.source} · sequence ${selectedAnomaly.step2_compute_correction.prev_settled_sequence} → ${selectedAnomaly.step2_compute_correction.safe_contiguous_cutoff}` : '대기 중'}</p>{selectedAnomaly.step2_compute_correction && <><p className="mt-1 text-text-secondary">Quantity {selectedAnomaly.step2_compute_correction.settled_quantity} · settlement version {selectedAnomaly.step2_compute_correction.settlement_version}</p><pre className="mt-3 rounded-xl bg-[#0f1115] border border-[#22252B] p-4 text-[11px] font-mono text-gray-300 overflow-x-auto"><code>{`-- Athena: Bronze events\nSELECT event_id, inventory_sequence, remaining_quantity\nFROM bronze_events\nWHERE store_id = '${selectedAnomaly.store_id}'\n  AND ingredient_id = '${selectedAnomaly.ingredient_id}'\n  AND inventory_sequence BETWEEN ${selectedAnomaly.step2_compute_correction.prev_settled_sequence}+1\n      AND ${selectedAnomaly.step2_compute_correction.safe_contiguous_cutoff};`}</code></pre></>}</div><div className="relative ml-7 rounded-xl border border-border/60 bg-surface p-4 shadow-sm"><span className="absolute -left-10 top-4 flex h-6 w-6 items-center justify-center rounded-full border-4 border-background bg-blue-500 text-[10px] font-black text-white">3</span><strong>Settlement Published → Flink Applied</strong><p className="mt-1 text-text-secondary">{selectedAnomaly.step3_apply?.resolved ? 'Settlement Kinesis · DynamoDB updated' : 'Flink 반영 대기 중'}</p>{selectedAnomaly.step3_apply && <div className="grid grid-cols-2 gap-3 mt-3 text-[11px]"><div className="rounded-lg bg-background border border-border/60 p-3"><span className="text-text-secondary block">Expected</span><strong>seq {selectedAnomaly.step3_apply.expected_settled_sequence} · v{selectedAnomaly.step3_apply.expected_settlement_version}</strong></div><div className="rounded-lg bg-background border border-border/60 p-3"><span className="text-text-secondary block">Observed</span><strong>seq {selectedAnomaly.step3_apply.observed_settled_sequence} · v{selectedAnomaly.step3_apply.observed_settlement_version}</strong></div></div>}{selectedAnomaly.superseding_settlement?.run_id && <p className="mt-3 text-text-secondary break-all">Resolved by later settlement: {selectedAnomaly.superseding_settlement.run_id}</p>}{selectedAnomaly.step3_apply?.resolved && <p className="mt-3 text-emerald-500 font-bold">✓ ReVerify PASS</p>}</div></div><p className={`mt-4 font-bold ${selectedAnomaly.escalate ? 'text-amber-500' : 'text-emerald-500'}`}>{selectedAnomaly.escalate ? 'Escalation required' : 'Escalation cleared'}</p></div>}</div>
    </div>}
  </div>;
}

function formatTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function formatWindowRange(startValue?: string | null) {
  if (!startValue) return 'No recent window';
  const start = new Date(startValue);
  if (Number.isNaN(start.getTime())) return 'No recent window';
  const end = new Date(start.getTime() + 5 * 60 * 1000);
  const clock = (date: Date) => date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${clock(start)} – ${clock(end)}`;
}

function formatRelative(value?: string | null) {
  if (!value) return 'No recent check';
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return 'No recent check';
  const minutes = Math.floor(Math.max(0, Date.now() - timestamp) / 60000);
  return minutes < 1 ? '방금 전' : `${minutes}분 전`;
}

function emptyTraceability(): TraceabilityData {
  return { components: {}, reconciliation: { latest_status: 'unknown', latest_window: null, latest_checked_at: '', latest_failed_keys: [], recent: {} }, settlement_timeline: [], anomaly_recoveries: [] };
}
