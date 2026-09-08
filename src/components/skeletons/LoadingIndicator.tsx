import { LoaderCircle } from 'lucide-react';

export function LoadingIndicator({ label = '데이터 불러오는 중...' }: { label?: string }) {
  return (
    <div className="inline-flex items-center gap-2 text-sm font-bold text-blue-500">
      <LoaderCircle className="w-4 h-4 animate-spin" />
      <span>{label}</span>
    </div>
  );
}
