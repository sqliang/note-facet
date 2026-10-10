/**
 * view/react/components/EmptyState.tsx — 空文档占位。
 * 只显示文件名与提示，不残留上一篇笔记的任何指标（docs/02 §8）。
 */
interface EmptyStateProps {
  title: string;
}

/** 空文档提示。 */
export function EmptyState({ title }: EmptyStateProps) {
  return (
    <div className="nf:flex nf:flex-col nf:items-center nf:gap-2 nf:p-6 nf:text-center">
      <p className="nf:text-sm nf:font-semibold nf:text-(--color-nf-text)">{title}</p>
      <p className="nf:text-xs nf:text-(--color-nf-muted)">这篇笔记还没有内容。</p>
    </div>
  );
}
