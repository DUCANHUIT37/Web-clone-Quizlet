'use client';

interface ProgressBarProps {
  current: number;
  total: number;
  color?: string;
  showLabel?: boolean;
  className?: string;
}

export function ProgressBar({
  current,
  total,
  color = 'var(--primary)',
  showLabel = true,
  className = '',
}: ProgressBarProps) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {showLabel && (
        <div className="flex justify-between text-xs font-medium text-[var(--text-muted)]">
          <span>{current} / {total}</span>
          <span>{pct}%</span>
        </div>
      )}
      <div
        className="h-2 rounded-full overflow-hidden bg-[var(--border)]"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`Tiến độ: ${current} trên ${total}`}
      >
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}
