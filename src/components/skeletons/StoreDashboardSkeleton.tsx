import { LoadingIndicator } from './LoadingIndicator';

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`bg-border/40 animate-pulse rounded-lg ${className}`} />;
}

export function StoreDashboardSkeleton() {
  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 pb-12">
      <div className="sticky top-0 z-20 backdrop-blur-md bg-background/80 border-b border-border py-4 px-2 flex items-center justify-between gap-4">
        <div className="space-y-2">
          <SkeletonBlock className="h-8 w-72" />
          <SkeletonBlock className="h-4 w-56" />
        </div>
        <LoadingIndicator />
      </div>

      <div className="flex justify-center">
        <LoadingIndicator label="최신 매장 데이터를 불러오는 중..." />
      </div>

      <section className="space-y-4">
        <SkeletonBlock className="h-7 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(item => (
            <SkeletonBlock key={item} className="h-40 rounded-2xl" />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <SkeletonBlock className="h-7 w-72" />
        <SkeletonBlock className="h-64 w-full rounded-2xl" />
      </section>

      <section className="space-y-4">
        <SkeletonBlock className="h-7 w-96" />
        {[1, 2, 3].map(item => (
          <SkeletonBlock key={item} className="h-32 w-full rounded-2xl" />
        ))}
      </section>

      <section className="space-y-4">
        <SkeletonBlock className="h-7 w-96" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(item => (
            <SkeletonBlock key={item} className="h-36 rounded-2xl" />
          ))}
        </div>
      </section>
    </div>
  );
}
