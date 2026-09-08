import React, { useState, useEffect } from 'react';
import { Activity, Database, Server, RefreshCcw, SearchCode, AlertTriangle, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { TraceabilityData, ComponentStatusInfo } from '../../types';
import { TraceabilitySkeleton } from '../skeletons/TraceabilitySkeleton';

export function AdminTab() {
  const [data, setData] = useState<TraceabilityData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSuccessTime, setLastSuccessTime] = useState<Date>(new Date());
  const [isStale, setIsStale] = useState<boolean>(false);
  const [highlightedRunId, setHighlightedRunId] = useState<string | null>(null);

  const fetchTraceability = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const res = await fetch('/api/ops/traceability', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-store'
        }
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const json: TraceabilityData = await res.json();
      setData(json);
      setHighlightedRunId(currentRunId => {
        const timelineRunIds = new Set(
          (json.settlement_timeline || []).map(item => item.run_id)
        );

        // Keep the user's selection across refreshes when possible. On the
        // first response, select the first settlement timeline item.
        if (currentRunId && timelineRunIds.has(currentRunId)) {
          return currentRunId;
        }

        return json.settlement_timeline?.[0]?.run_id || null;
      });
      setLastSuccessTime(new Date());
      setIsStale(false);
      setError(null);
    } catch (err: any) {
      console.error("Traceability fetch error:", err);
      setError(err?.message || "데이터를 불러오는 중 오류가 발생했습니다.");
      setIsStale(true);
    } finally {
      if (isManual) setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTraceability(false);
    const interval = setInterval(() => {
      fetchTraceability(false);
    }, 30000); // 30s polling

    const staleCheck = setInterval(() => {
      if (Date.now() - lastSuccessTime.getTime() > 60000) {
        setIsStale(true);
      }
    }, 10000);

    return () => {
      clearInterval(interval);
      clearInterval(staleCheck);
    };
  }, []);

  const formatRelativeTime = (isoString: string | null) => {
    if (!isoString) return 'N/A';
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return `${diffSec}초 전`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}분 전`;
    const diffHour = Math.floor(diffMin / 60);
    return `${diffHour}시간 전`;
  };

  const formatTimeOnly = (isoString: string | null) => {
    if (!isoString) return '--:--:--';
    const date = new Date(isoString);
    return date.toTimeString().split(' ')[0];
  };

  const formatLag = (ms: number | null | undefined) => {
    if (ms === null || ms === undefined) return 'no data';
    if (ms < 1000) return `${ms}ms lag`;
    return `${(ms / 1000).toFixed(1)}s lag`;
  };

  const isResolvedOutcome = (outcome: string, resolved?: boolean) =>
    outcome === 'resolved' ||
    outcome === 'resolved_by_later_settlement' ||
    resolved === true;

  const scrollToAnomaly = (runId: string) => {
    setHighlightedRunId(runId);
    const el = document.getElementById(`anomaly-${runId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-blue-500', 'bg-blue-500/5');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-500/5');
      }, 3000);
    }
  };

  if (isLoading && !data) {
    return <TraceabilitySkeleton />;
  }

  if (error && !data) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-6">
        <div className="w-16 h-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto text-2xl font-bold">!</div>
        <h2 className="text-2xl font-bold text-text-primary">System Traceability 로드 실패</h2>
        <p className="text-text-secondary">{error}</p>
        <button
          onClick={() => fetchTraceability(true)}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm"
        >
          재시도
        </button>
      </div>
    );
  }

  const comp = data?.components || {};
  const recon = data?.reconciliation || { latest_status: 'unknown', latest_window: null, latest_checked_at: new Date().toISOString(), latest_failed_keys: [], recent: {} };
  const timeline = data?.settlement_timeline || [];
  const anomalies = data?.anomaly_recoveries || [];
  const selectedAnomalies = highlightedRunId
    ? anomalies.filter(ano => ano.run_id === highlightedRunId)
    : [];

  const getReconStatusBadge = (status: string) => {
    switch (status) {
      case 'PASS':
        return <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">PASS</span>;
      case 'FAIL':
        return <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-red-500/15 text-red-500 border border-red-500/30">FAIL</span>;
      case 'INCONCLUSIVE':
        return <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/15 text-amber-500 border border-amber-500/30">INCONCLUSIVE</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-slate-500/15 text-slate-400 border border-slate-500/30">UNKNOWN</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface border border-border rounded-2xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">System Traceability</h1>
            {getReconStatusBadge(recon.latest_status)}
            <span className="text-xs sm:text-sm text-text-secondary font-medium">
              window {formatTimeOnly(recon.latest_window)} · checked {formatRelativeTime(recon.latest_checked_at)}
            </span>
          </div>
          <p className="text-sm sm:text-base text-text-secondary mt-1">데이터 파이프라인 상태 모니터링 및 유실 추적 (Targeted Settlement)</p>
          {recon.latest_failed_keys && recon.latest_failed_keys.length > 0 && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="text-xs font-bold text-red-500">Failed Keys:</span>
              {recon.latest_failed_keys.map((key, idx) => (
                <span key={idx} className="px-2 py-0.5 rounded text-xs font-mono bg-red-500/10 text-red-500 border border-red-500/20">
                  {key}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            onClick={() => fetchTraceability(true)}
            disabled={isRefreshing}
            className="px-4 py-2 bg-background border border-border rounded-xl text-sm font-bold text-text-primary hover:bg-border/30 transition-all flex items-center gap-2 shadow-sm"
          >
            <RefreshCcw className={`w-4 h-4 text-blue-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            새로고침
          </button>
          
          <div className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 border shadow-sm ${
            isStale ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
          }`}>
            <div className={`w-2.5 h-2.5 rounded-full ${isStale ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} />
            {isStale ? 'Sync Stale' : 'Live Sync Active'}
          </div>
        </div>
      </div>

      {/* 2. Component Status Cards (4 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <ComponentCard 
          name="API Gateway" 
          icon={<Server className="w-6 h-6 text-blue-500" />}
          info={comp.api_gateway}
          renderMetrics={(info) => (
            <>
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-secondary font-medium">15분 요청</span>
                <span className="font-bold text-text-primary">{(info?.requests_15m ?? 0).toLocaleString()} 건</span>
              </div>
              <div className="flex justify-between items-center text-sm mt-1">
                <span className="text-text-secondary font-medium">5xx 오류</span>
                <span className={`font-bold ${(info?.errors_5xx_15m ?? 0) > 0 ? 'text-red-500' : 'text-text-primary'}`}>
                  {info?.errors_5xx_15m ?? 0} 건
                </span>
              </div>
            </>
          )}
        />

        <ComponentCard 
          name="Kinesis Stream" 
          icon={<Activity className="w-6 h-6 text-purple-500" />}
          info={comp.kinesis}
          renderMetrics={(info) => (
            <>
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-secondary font-medium">Iterator Age</span>
                <span className={`font-bold ${(info?.iterator_age_ms ?? 0) > 600000 ? 'text-red-500' : 'text-emerald-500'}`}>
                  {formatLag(info?.iterator_age_ms)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm mt-1">
                <span className="text-text-secondary font-medium">Put 실패 (15m)</span>
                <span className={`font-bold ${(info?.put_failed_15m ?? 0) > 0 ? 'text-red-500' : 'text-text-primary'}`}>
                  {info?.put_failed_15m ?? 0}
                </span>
              </div>
            </>
          )}
        />

        <ComponentCard 
          name="Flink Processor" 
          icon={<RefreshCcw className="w-6 h-6 text-amber-500" />}
          info={comp.flink}
          renderMetrics={(info) => (
            <>
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-secondary font-medium">Lag Behind</span>
                <span className={`font-bold ${(info?.millis_behind_latest ?? 0) > 30000 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {formatLag(info?.millis_behind_latest)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm mt-1">
                <span className="text-text-secondary font-medium">다운타임 / 재시작</span>
                <span className={`font-bold ${(info?.downtime_ms ?? 0) > 0 || (info?.full_restarts_15m ?? 0) > 0 ? 'text-red-500' : 'text-text-primary'}`}>
                  {info?.downtime_ms ? `${info.downtime_ms}ms` : '0ms'} ({info?.full_restarts_15m ?? 0}회)
                </span>
              </div>
            </>
          )}
        />

        <ComponentCard 
          name="DynamoDB" 
          icon={<Database className="w-6 h-6 text-emerald-500" />}
          info={comp.dynamodb}
          renderMetrics={(info) => (
            <>
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-secondary font-medium">Throttled (15m)</span>
                <span className={`font-bold ${(info?.throttled_15m ?? 0) > 0 ? 'text-amber-500' : 'text-text-primary'}`}>
                  {info?.throttled_15m ?? 0}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm mt-1">
                <span className="text-text-secondary font-medium">시스템 오류</span>
                <span className={`font-bold ${(info?.system_errors_15m ?? 0) > 0 ? 'text-red-500' : 'text-text-primary'}`}>
                  {info?.system_errors_15m ?? 0}
                </span>
              </div>
            </>
          )}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 3. 5-Min Settlement Timeline */}
        <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-sm col-span-1">
          <h3 className="font-bold text-xl mb-6 flex items-center gap-3 text-text-primary">
            <Clock className="w-6 h-6 text-blue-500" />
            5-Min Settlement Timeline
          </h3>

          {timeline.length === 0 ? (
            <p className="text-text-secondary text-center py-8">최근 {data?._meta?.lookback_days || 2}일 내 해당 이벤트 없음</p>
          ) : (
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px before:h-full before:w-0.5 before:bg-border">
              {timeline.map((item, idx) => {
                const isApplied = item.status === 'APPLIED';
                const isFailed = item.status === 'FAILED';
                const isPending = item.status === 'PENDING';
                const isGap = item.status === 'GAP';
                const isResolvedByLaterSettlement =
                  item.status === 'RESOLVED' && item.resolution === 'later_settlement';

                let dotColor = 'bg-slate-400';
                if (isApplied) dotColor = 'bg-emerald-500';
                if (isFailed) dotColor = 'bg-red-500';
                if (isPending) dotColor = 'bg-amber-500 animate-pulse';
                if (isGap) dotColor = 'bg-amber-500';

                return (
                  <div 
                    key={idx} 
                    onClick={() => scrollToAnomaly(item.run_id)}
                    className={`relative flex items-start gap-4 pl-8 group cursor-pointer ${
                      highlightedRunId === item.run_id ? 'rounded-xl ring-2 ring-blue-500/30' : ''
                    }`}
                  >
                    <div className={`absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-surface ${dotColor} shadow-sm`} />
                    <div className="flex-1 bg-background border border-border rounded-xl p-4 shadow-sm hover:border-blue-500/50 transition-all">
                      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                        <span className="text-sm font-extrabold text-text-primary">{formatTimeOnly(item.at)}</span>
                        <div className="flex items-center gap-2">
                          {item.conflict && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                              ⚠ conflict
                            </span>
                          )}
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md ${
                            isApplied || isResolvedByLaterSettlement ? 'bg-emerald-500/15 text-emerald-500' :
                            isFailed ? 'bg-red-500/15 text-red-500' :
                            isPending ? 'bg-amber-500/15 text-amber-500' : 'bg-amber-500/15 text-amber-500'
                          }`}>
                            {isResolvedByLaterSettlement ? 'Resolved by later settlement' : item.status}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs font-mono text-text-secondary mb-1">
                        ID: <span className="text-blue-500 font-bold">{item.run_id}</span>
                      </div>
                      {isResolvedByLaterSettlement && (
                        <div className="text-xs text-emerald-500 font-bold mb-1">
                          Resolved by: {item.resolved_by_run_id || 'later settlement'}
                        </div>
                      )}
                      <div className="text-xs text-text-primary font-medium mb-1">
                        {item.store_id} / <span className="font-bold">{item.ingredient_id}</span>
                      </div>
                      <div className="text-xs font-mono text-text-secondary bg-surface/80 p-2 rounded border border-border/60 flex items-center justify-between">
                        <span>seq {item.prev_settled_sequence ?? 'null'} → {item.settled_sequence ?? 'null'}</span>
                        <span className="font-bold text-text-primary">qty: {item.settled_quantity || '—'} (v{item.settlement_version ?? '?'})</span>
                      </div>

                      {item.reasons && item.reasons.length > 0 && (
                        <div className="mt-2 text-xs text-red-400 space-y-0.5">
                          {item.reasons.map((r, ri) => (
                            <p key={ri}>• {r}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. Anomaly Tracker: Sequence Gap Recovery */}
        <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-sm col-span-1 lg:col-span-2">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="font-bold text-xl flex items-center gap-3 text-amber-500">
              <SearchCode className="w-6 h-6" />
              Anomaly Tracker: Sequence Gap Recovery
            </h3>
            <span className="text-xs font-bold text-text-secondary bg-background border border-border px-3 py-1 rounded-lg">
              권위 소스: S3 Bronze + Athena
            </span>
          </div>
          <p className="text-sm sm:text-base text-text-secondary mb-8 font-medium">
            최근 anomaly 이벤트의 역추적 및 3단계 자동 보정 흐름
          </p>

          {selectedAnomalies.length === 0 ? (
            <p className="text-text-secondary text-center py-12">
              {highlightedRunId
                ? '선택한 settlement에 연결된 anomaly 이벤트가 없습니다.'
                : 'settlement timeline을 선택하면 anomaly 이벤트가 표시됩니다.'}
            </p>
          ) : (
            <div className="space-y-8">
              {selectedAnomalies.map((ano, idx) => {
                const isUnresolved = ano.outcome === 'unresolved_gap';
                const isResolved = isResolvedOutcome(ano.outcome, ano.step3_apply?.resolved);
                const isResolvedByLaterSettlement =
                  ano.outcome === 'resolved_by_later_settlement' ||
                  ano.step2_compute_correction?.source === 'later_settlement' ||
                  ano.step3_apply?.resolution === 'later_settlement';

                return (
                  <div 
                    key={idx} 
                    id={`anomaly-${ano.run_id}`}
                    className={`bg-background border rounded-2xl p-6 shadow-sm transition-all ${
                      highlightedRunId === ano.run_id ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-border'
                    }`}
                  >
                    {/* Anomaly Header */}
                    <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                          {ano.anomaly_type}
                        </span>
                        <span className="text-xs font-mono text-text-primary font-bold">{ano.run_id}</span>
                        <span className="text-xs text-text-secondary">({formatRelativeTime(ano.detected_at)})</span>
                        {isResolvedByLaterSettlement && (
                          <span className="text-xs font-bold text-emerald-500">
                            Resolved by later settlement
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-text-secondary">{ano.store_id} / {ano.ingredient_id}</span>
                        {ano.escalate && !isResolved && (
                          <span className="px-2.5 py-1 rounded-md text-xs font-extrabold bg-red-500/15 text-red-500 border border-red-500/30 animate-pulse">
                            ESCALATE
                          </span>
                        )}
                        {isResolved && (
                          <span className="px-2.5 py-1 rounded-md text-xs font-extrabold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                            RESOLVED
                          </span>
                        )}
                        {isResolved && (
                          <span className="text-xs font-bold text-emerald-500">Escalation cleared</span>
                        )}
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                          isResolved ? 'bg-emerald-500/15 text-emerald-500' : 'bg-amber-500/15 text-amber-500'
                        }`}>
                          {isResolved ? 'RESOLVED' : ano.outcome}
                        </span>
                      </div>
                    </div>

                    {isResolvedByLaterSettlement && ano.superseding_settlement && (
                      <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                        <div className="text-xs font-extrabold uppercase text-emerald-500 mb-3">
                          Resolution settlement
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-text-primary">
                          <span>Run ID: <strong>{ano.superseding_settlement.run_id}</strong></span>
                          <span>Emitted: <strong>{formatRelativeTime(ano.superseding_settlement.emitted_at)}</strong></span>
                          <span>Sequence: <strong>{ano.superseding_settlement.settled_sequence}</strong></span>
                          <span>Quantity: <strong>{ano.superseding_settlement.settled_quantity}</strong></span>
                          <span>Version: <strong>{ano.superseding_settlement.settlement_version}</strong></span>
                        </div>
                      </div>
                    )}

                    {/* 3-Step Stepper */}
                    <div className="space-y-6">
                      {/* Step 1: Detect */}
                      <StepBox 
                        stepNumber={1}
                        title="Gap Detected & Validation"
                        status="complete"
                        content={
                          <div className="space-y-3">
                            <span className="inline-flex px-2.5 py-1 rounded bg-red-500/15 text-red-400 text-xs font-extrabold">
                              MISMATCH DETECTED
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {ano.step1_detect.reasons.map((r, ri) => (
                                <span key={ri} className="px-2 py-0.5 rounded text-xs bg-red-500/10 text-red-400 font-medium">
                                  {r}
                                </span>
                              ))}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="bg-surface p-3 rounded-xl border border-border/60">
                                <p className="text-xs font-bold text-text-secondary mb-1">Observed</p>
                                <pre className="text-xs font-mono text-text-primary whitespace-pre-wrap">
                                  {JSON.stringify(ano.step1_detect.observed, null, 2)}
                                </pre>
                              </div>
                              <div className="bg-surface p-3 rounded-xl border border-border/60">
                                <p className="text-xs font-bold text-text-secondary mb-1">Expected</p>
                                <pre className="text-xs font-mono text-text-primary whitespace-pre-wrap">
                                  {JSON.stringify(ano.step1_detect.expected, null, 2)}
                                </pre>
                              </div>
                            </div>
                            {ano.step1_detect.safe_cutoff_hint !== null && ano.step1_detect.safe_cutoff_hint !== undefined && (
                              <p className="text-xs font-mono text-blue-400 font-semibold">
                                Safe Cutoff Hint: {ano.step1_detect.safe_cutoff_hint}
                              </p>
                            )}
                          </div>
                        }
                      />

                      {/* Step 2: Compute Correction */}
                      <StepBox 
                        stepNumber={2}
                        title="Compute Correction (Athena over S3 Bronze)"
                        status={ano.step2_compute_correction ? (isUnresolved && !isResolvedByLaterSettlement ? 'warning' : 'complete') : 'pending'}
                        content={ano.step2_compute_correction ? (
                          <div className="space-y-3">
                            {ano.step2_compute_correction.source === 'later_settlement' && (
                              <span className="inline-flex px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-500 text-xs font-extrabold">
                                COVERED BY LATER SETTLEMENT
                              </span>
                            )}
                            <div className="flex items-center gap-2 flex-wrap text-xs">
                              <span className="px-2.5 py-1 rounded bg-blue-500/15 text-blue-400 font-bold font-mono">
                                source: {ano.step2_compute_correction.source}
                              </span>
                              <span className="text-text-secondary">
                                seq {ano.step2_compute_correction.prev_settled_sequence} → {ano.step2_compute_correction.safe_contiguous_cutoff}
                              </span>
                              <span className="font-bold text-text-primary">
                                qty: {ano.step2_compute_correction.settled_quantity} (v{ano.step2_compute_correction.settlement_version})
                              </span>
                              {ano.step2_compute_correction.conflict && (
                                <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-500 font-bold">
                                  ⚠ conflict detected
                                </span>
                              )}
                            </div>
                            <pre className="bg-[#0f1115] border border-[#22252B] rounded-xl p-4 text-xs font-mono text-gray-300 overflow-x-auto shadow-sm">
                              <code>{`-- athena: bronze_events
SELECT event_id, inventory_sequence, remaining_quantity
FROM bronze_events
WHERE store_id = '${ano.store_id}' AND ingredient_id = '${ano.ingredient_id}'
  AND inventory_sequence BETWEEN ${ano.step2_compute_correction.prev_settled_sequence}+1 AND ${ano.step2_compute_correction.safe_contiguous_cutoff};`}</code>
                            </pre>
                          </div>
                        ) : (
                          <p className="text-xs text-text-secondary italic">대기 중 / 계산 불가</p>
                        )}
                      />

                      {/* Step 3: Apply */}
                      <StepBox 
                        stepNumber={3}
                        title="Apply → DynamoDB Realtime State"
                        status={ano.step3_apply ? (ano.step3_apply.resolved ? 'complete' : 'warning') : 'pending'}
                        content={ano.step3_apply ? (
                          <div className="space-y-3">
                            {ano.step3_apply.resolution === 'later_settlement' && (
                              <div className="space-y-2">
                                <span className="inline-flex px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-500 text-xs font-extrabold">
                                  RESOLVED BY LATER SETTLEMENT
                                </span>
                                {ano.step3_apply.resolved_by_run_id && (
                                  <p className="text-xs text-text-primary">
                                    Resolution run: <strong>{ano.step3_apply.resolved_by_run_id}</strong>
                                  </p>
                                )}
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div className="bg-surface p-3 rounded-xl border border-border/60">
                                <span className="text-text-secondary font-bold block mb-1">Expected</span>
                                <p className="font-mono text-text-primary">seq: {ano.step3_apply.expected_settled_sequence} (v{ano.step3_apply.expected_settlement_version})</p>
                              </div>
                              <div className="bg-surface p-3 rounded-xl border border-border/60">
                                <span className="text-text-secondary font-bold block mb-1">Observed</span>
                                <p className={`font-mono font-bold ${ano.step3_apply.resolved ? 'text-emerald-500' : 'text-amber-500'}`}>
                                  seq: {ano.step3_apply.observed_settled_sequence} (v{ano.step3_apply.observed_settlement_version})
                                </p>
                              </div>
                            </div>
                            <pre className="bg-[#0f1115] border border-[#22252B] rounded-xl p-4 text-xs font-mono text-gray-300 overflow-x-auto shadow-sm">
                              <code>{`UpdateItem({
  TableName: "inventory_realtime_state",
  Key: { PK: "STORE#${ano.store_id}", SK: "INGREDIENT#${ano.ingredient_id}" },
  UpdateExpression: "SET settled_sequence = :s, settlement_version = :v",
  ExpressionAttributeValues: { ":s": ${ano.step3_apply.expected_settled_sequence}, ":v": ${ano.step3_apply.expected_settlement_version} }
});`}</code>
                            </pre>
                          </div>
                        ) : (
                          <p className="text-xs text-text-secondary italic">Flink 반영 대기 중</p>
                        )}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ComponentCard({ name, icon, info, renderMetrics }: { name: string; icon: React.ReactNode; info?: ComponentStatusInfo; renderMetrics: (info?: ComponentStatusInfo) => React.ReactNode }) {
  const status = info?.status || 'unknown';
  const isHealthy = status === 'healthy';
  const isWarning = status === 'warning';
  const isCritical = status === 'critical';

  let badgeColor = 'bg-slate-500/15 text-slate-400 border-slate-500/30';
  let dotColor = 'bg-slate-400';
  if (isHealthy) {
    badgeColor = 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';
    dotColor = 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
  } else if (isWarning) {
    badgeColor = 'bg-amber-500/15 text-amber-500 border-amber-500/30';
    dotColor = 'bg-amber-500 animate-pulse';
  } else if (isCritical) {
    badgeColor = 'bg-red-500/15 text-red-500 border-red-500/30';
    dotColor = 'bg-red-500 animate-pulse';
  }

  return (
    <div className={`bg-surface border rounded-2xl p-5 flex flex-col justify-between transition-all ${
      isCritical ? 'border-red-500/50 bg-red-500/[0.02]' : isWarning ? 'border-amber-500/50 bg-amber-500/[0.02]' : 'border-border'
    }`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5 min-w-0 text-text-primary">
          <div className="shrink-0">{icon}</div>
          <span className="text-sm sm:text-base font-bold truncate">{name}</span>
        </div>
        <div className={`w-3 h-3 rounded-full shrink-0 ${dotColor}`} />
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className={`px-2.5 py-0.5 rounded text-xs font-extrabold uppercase border ${badgeColor}`}>
            {status}
          </span>
        </div>
        <div className="space-y-1 mt-2">
          {renderMetrics(info)}
        </div>
      </div>
    </div>
  );
}

function StepBox({ stepNumber, title, status, content }: { stepNumber: number; title: string; status: 'complete' | 'warning' | 'pending'; content: React.ReactNode }) {
  let badgeColor = 'bg-border text-text-secondary';
  if (status === 'complete') badgeColor = 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30';
  if (status === 'warning') badgeColor = 'bg-amber-500/20 text-amber-500 border border-amber-500/30';

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${badgeColor}`}>
          {status === 'complete' ? <CheckCircle2 className="w-4 h-4" /> : stepNumber}
        </div>
        {stepNumber < 3 && <div className="flex-1 w-0.5 bg-border my-2" />}
      </div>
      <div className="flex-1 pb-2 min-w-0">
        <h4 className="text-sm font-bold text-text-primary mb-2 flex items-center gap-2">
          <span>Step {stepNumber}:</span> {title}
        </h4>
        <div className="bg-background border border-border/80 rounded-xl p-4">
          {content}
        </div>
      </div>
    </div>
  );
}
