// Custom glass tooltip. Recharts passes { active, payload, label } to the
// content render prop; we type it permissively to stay version-stable.
interface TooltipPayloadItem {
  color?: string;
  name?: string | number;
  value?: number;
}

interface Props {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: unknown;
  formatValue: (v: number) => string;
  formatLabel?: (l: unknown) => string;
}

export function ChartTooltip({
  active,
  payload,
  label,
  formatValue,
  formatLabel,
}: Props) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="dl-tooltip">
      <div className="dl-tooltip-label">
        {formatLabel ? formatLabel(label) : String(label)}
      </div>
      {payload.map((r, i) => (
        <div key={i} className="dl-tooltip-row">
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: r.color,
              display: 'inline-block',
            }}
          />
          <span style={{ color: 'var(--dl-text-secondary)' }}>{r.name}</span>
          <span style={{ marginLeft: 'auto', fontWeight: 600 }}>
            {formatValue(r.value ?? 0)}
          </span>
        </div>
      ))}
    </div>
  );
}
