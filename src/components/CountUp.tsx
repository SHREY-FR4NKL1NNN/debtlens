import { useCountUp } from '../hooks/useCountUp';

interface Props {
  value: number;
  format: (n: number) => string;
  duration?: number;
  className?: string;
}

/** Renders a number that counts up to `value` (800ms ease-out by default). */
export function CountUp({ value, format, duration, className }: Props) {
  const animated = useCountUp(value, duration);
  return (
    <span className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {format(animated)}
    </span>
  );
}
