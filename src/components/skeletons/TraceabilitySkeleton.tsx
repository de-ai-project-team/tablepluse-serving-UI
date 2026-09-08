import { LoadingIndicator } from './LoadingIndicator';

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`bg-border/40 animate-pulse rounded-lg ${className}`} />;
}

export function TraceabilitySkeleton() {
  return (
    <div className="max-w-7xl mx-auto space-y-8 p-6">
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-3">
        <SkeletonBlock className="h-8 w-80" />
        <SkeletonBlock className="h-4 w-96" />
        <LoadingIndicator label="파이프라인 상태를 불러오는 중..." />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(item => (
          <SkeletonBlock key={item} className="h-36 rounded-2xl" />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
          <SkeletonBlock className="h-7 w-64 mb-6" />
          <div className="space-y-5">
            {[1, 2, 3, 4].map(item => (
              <SkeletonBlock key={item} className="h-28 rounded-xl" />
            ))}
          </div>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-sm lg:col-span-2">
          <SkeletonBlock className="h-7 w-80 mb-4" />
          <SkeletonBlock className="h-4 w-96 mb-8" />
          <SkeletonBlock className="h-[520px] rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
