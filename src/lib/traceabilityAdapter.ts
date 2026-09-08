import { TraceabilityData, ComponentStatusInfo, BronzeS3Info, BatchInfo } from '../types';

export type PipelineHealth = 'healthy' | 'degraded' | 'error' | 'unknown';
export type PipelineActivityStatus = 'active' | 'idle' | 'unknown';
export type PipelineNodeId =
  | 'restaurant-events-kinesis'
  | 'firehose'
  | 'bronze'
  | 'flink'
  | 'dynamodb'
  | 'settlement-kinesis'
  | 'reconciliation'
  | 'batch'
;

export interface PipelineMetric {
  label: string;
  value: string | number;
  unit?: string;
}

export interface PipelineNode {
  id: PipelineNodeId;
  title: string;
  subtitle?: string;
  healthStatus: PipelineHealth;
  activityStatus?: PipelineActivityStatus;
  lastActivityAt?: string | null;
  metrics: PipelineMetric[];
  detail?: unknown;
  staticOnly?: boolean;
  phaseSummary?: Array<{ name: string; status: string }>;
}

export interface PipelineEdge {
  from: PipelineNodeId;
  to: PipelineNodeId;
  label?: string;
  kind: 'normal' | 'correction' | 'dependency';
}

export interface PipelineOperationsModel {
  nodes: PipelineNode[];
  edges: PipelineEdge[];
}

export function healthFromStatus(status: string | null | undefined): PipelineHealth {
  switch (status?.toLowerCase()) {
    case 'healthy':
    case 'running':
    case 'succeeded':
    case 'success':
    case 'complete':
    case 'completed':
      return 'healthy';
    case 'warning':
    case 'degraded':
    case 'pending':
    case 'in_progress':
      return 'degraded';
    case 'critical':
    case 'failed':
    case 'failure':
    case 'error':
      return 'error';
    default:
      return 'unknown';
  }
}

function activityFromCounts(...counts: Array<number | null | undefined>): PipelineActivityStatus {
  if (counts.some(count => (count ?? 0) > 0)) return 'active';
  if (counts.every(count => count !== null && count !== undefined)) return 'idle';
  return 'unknown';
}

function componentNode(
  id: PipelineNodeId,
  title: string,
  subtitle: string,
  info: ComponentStatusInfo | undefined,
  metrics: PipelineMetric[],
  lastActivityAt?: string | null,
  activityCounts: Array<number | null | undefined> = [info?.incoming_records_15m]
): PipelineNode {
  const failedPuts = info?.put_failed_15m ?? 0;
  const healthStatus = failedPuts > 0 ? 'error' : healthFromStatus(info?.status);
  return {
    id,
    title,
    subtitle,
    healthStatus,
    lastActivityAt,
    metrics,
    detail: info,
    activityStatus: activityFromCounts(...activityCounts),
  };
}

export function createPipelineOperationsModel(data: TraceabilityData): PipelineOperationsModel {
  const kinesis = data.components.kinesis;
  const settlementKinesis = data.components.settlement_kinesis;
  const firehose = data.components.firehose;
  const flink = data.components.flink;
  const dynamodb = data.components.dynamodb;
  const bronze = data.bronze_s3;
  const batch = data.batch;

  const firehoseDeliveryFailed = firehose?.delivery_success === false ||
    (typeof firehose?.delivery_success === 'string' && ['failed', 'failure', 'error'].includes(firehose.delivery_success.toLowerCase()));
  const flinkHealth = (flink?.downtime_ms ?? 0) > 0 ? 'error' : (flink?.full_restarts_15m ?? 0) > 0 ? 'degraded' : healthFromStatus(flink?.status);
  const nodes: PipelineNode[] = [
    componentNode('restaurant-events-kinesis', 'Kinesis', 'Realtime Events', kinesis, [
      { label: 'Input', value: kinesis?.incoming_records_15m ?? '—', unit: '/ 15m' },
      { label: 'Fan-out', value: `${kinesis?.firehose_read_records_15m ?? '—'} Firehose · ${kinesis?.flink_read_records_15m ?? '—'} Flink` },
    ], kinesis?.last_activity_at, [kinesis?.incoming_records_15m]),
    { ...componentNode('firehose', 'Firehose', 'Bronze Delivery', firehose, [
      { label: 'Incoming', value: firehose?.incoming_records_15m ?? '—', unit: '/ 15m' },
      { label: 'Delivered', value: firehose?.delivered_records_15m ?? '—' },
    ], firehose?.last_delivery_at, [firehose?.incoming_records_15m, firehose?.delivered_records_15m]), healthStatus: firehoseDeliveryFailed ? 'error' : healthFromStatus(firehose?.status) },
    {
      id: 'bronze',
      title: 'Bronze S3',
      subtitle: 'Event History',
      healthStatus: bronze?.error ? 'error' : bronze?.last_object_at ? healthFromStatus(bronze.status || 'healthy') : 'unknown',
      activityStatus: bronze?.last_object_at ? 'active' : 'unknown',
      lastActivityAt: bronze?.last_object_at,
      metrics: [{ label: 'Last object', value: bronze?.last_object_at ? 'available' : 'No recent object' }],
      detail: bronze,
    },
    { ...componentNode('flink', 'Flink', 'Realtime Processing', flink, [
      { label: 'Consumed', value: flink?.source_records_15m ?? '—', unit: '/ 15m' },
      { label: 'Input lag', value: flink?.millis_behind_latest == null ? 'No recent datapoint' : `${flink.millis_behind_latest}ms` },
      { label: 'Restarts', value: flink?.full_restarts_15m ?? '—', unit: '/ 15m' },
    ], flink?.last_source_activity_at, [flink?.source_records_15m]), healthStatus: flinkHealth },
    componentNode('dynamodb', 'DynamoDB', 'Realtime State', dynamodb, [
      { label: 'Write capacity', value: dynamodb?.writes_15m ?? '—', unit: '/ 15m' },
      { label: 'Throttled', value: dynamodb?.throttled_15m ?? '—' },
    ], undefined, [dynamodb?.writes_15m]),
    componentNode('settlement-kinesis', 'Settlement Kinesis', 'Correction / Recovery', settlementKinesis, [
      { label: 'Incoming', value: settlementKinesis?.incoming_records_15m ?? '—', unit: '/ 15m' },
      { label: 'Put failed', value: settlementKinesis?.put_failed_15m ?? '—' },
    ], settlementKinesis?.last_activity_at, [settlementKinesis?.incoming_records_15m]),
    {
      id: 'reconciliation',
      title: 'Reconciliation',
      subtitle: '5-Min Correctness Check',
      healthStatus: data.reconciliation.latest_status === 'PASS' ? 'healthy' : data.reconciliation.latest_status === 'FAIL' ? 'error' : 'degraded',
      metrics: [{ label: 'Latest', value: data.reconciliation.latest_status }, { label: 'Failed keys', value: data.reconciliation.latest_failed_keys.length }],
      detail: data.reconciliation,
    },
    {
      id: 'batch',
      title: 'Periodic Batch',
      subtitle: 'Historical Pipeline',
      healthStatus: healthFromStatus(batch?.status),
      activityStatus: batch?.last_execution ? 'active' : 'unknown',
      lastActivityAt: batch?.last_execution?.finished_at || batch?.last_execution?.started_at,
      metrics: batch?.last_execution ? [
        { label: 'Status', value: batch.last_execution.status || 'unknown' },
        { label: 'Target', value: batch.last_execution.target_date || '—' },
      ] : [{ label: 'Status', value: 'No recent execution' }],
      phaseSummary: batch?.last_execution?.phases?.map(phase => ({ name: phase.phase || 'phase', status: phase.status || 'unknown' })),
      detail: batch,
    },
  ];

  return {
    nodes,
    edges: [
      { from: 'restaurant-events-kinesis', to: 'flink', kind: 'normal', label: 'realtime' },
      { from: 'flink', to: 'dynamodb', kind: 'normal' },
      { from: 'restaurant-events-kinesis', to: 'firehose', kind: 'normal', label: formatCount(kinesis?.incoming_records_15m) },
      { from: 'firehose', to: 'bronze', kind: 'normal', label: formatCount(firehose?.delivered_records_15m) },
      { from: 'bronze', to: 'batch', kind: 'normal', label: 'batch input' },
      { from: 'bronze', to: 'reconciliation', kind: 'dependency' },
      { from: 'dynamodb', to: 'reconciliation', kind: 'dependency' },
      { from: 'reconciliation', to: 'settlement-kinesis', kind: 'correction', label: 'mismatch' },
      { from: 'batch', to: 'settlement-kinesis', kind: 'correction', label: 'authoritative settlement' },
      { from: 'settlement-kinesis', to: 'flink', kind: 'correction' },
    ],
  };
}

function formatCount(value: number | null | undefined) {
  return value == null ? undefined : `${value.toLocaleString()} / 15m`;
}

export interface PipelineAreaHealth {
  realtime: PipelineHealth;
  historical: PipelineHealth;
  correctness: PipelineHealth;
  serving: PipelineHealth;
}

export function derivePipelineAreaHealth(data: TraceabilityData): PipelineAreaHealth {
  const model = createPipelineOperationsModel(data);
  const node = (id: PipelineNodeId) => model.nodes.find(item => item.id === id)?.healthStatus ?? 'unknown';
  return {
    realtime: combineHealth([node('restaurant-events-kinesis'), node('firehose'), node('flink'), node('dynamodb')]),
    historical: combineHealth([node('bronze'), node('batch')]),
    correctness: node('reconciliation'),
    serving: node('dynamodb'),
  };
}

function combineHealth(statuses: PipelineHealth[]): PipelineHealth {
  if (statuses.includes('error')) return 'error';
  if (statuses.includes('degraded')) return 'degraded';
  if (statuses.every(status => status === 'unknown')) return 'unknown';
  return 'healthy';
}

function phaseFor(batch: BatchInfo | undefined, keyword: string) {
  return batch?.last_execution?.phases?.find(phase => phase.phase?.toLowerCase().includes(keyword));
}

function phaseHealth(batch: BatchInfo | undefined, keyword: string): PipelineHealth {
  const phase = phaseFor(batch, keyword);
  return phase ? healthFromStatus(phase.status) : 'unknown';
}

function phaseMetrics(batch: BatchInfo | undefined, keyword: string): PipelineMetric[] {
  const phase = phaseFor(batch, keyword);
  if (!phase) return [{ label: 'Status', value: 'No recent execution' }];
  return [
    { label: 'Status', value: phase.status || 'unknown' },
    ...(phase.processing_run_id ? [{ label: 'Run', value: phase.processing_run_id }] : []),
    ...(phase.duration_seconds != null ? [{ label: 'Duration', value: phase.duration_seconds, unit: 'sec' }] : []),
  ];
}
