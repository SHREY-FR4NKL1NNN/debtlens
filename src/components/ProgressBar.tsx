interface Props {
  value: number; // 0-100
  color?: string; // CSS color or var()
  height?: number;
  track?: string;
}

/** Thin progress bar (used on debt cards to show % paid off). */
export function ProgressBar({ value, color = 'var(--dl-accent)', height = 6, track }: Props) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className="progress-track"
      style={{ height, background: track }}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}
