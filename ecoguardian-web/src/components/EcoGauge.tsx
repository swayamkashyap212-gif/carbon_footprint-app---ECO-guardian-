interface EcoGaugeProps {
  value: number;
  goal: number;
  size?: number;
}

function getColorClass(value: number, goal: number): string {
  const ratio = value / goal;
  if (ratio <= 0.6) return '#154212';
  if (ratio <= 0.85) return '#b86e00';
  return '#ba1a1a';
}

function getStatusLabel(value: number, goal: number): string {
  const ratio = value / goal;
  if (ratio <= 0.6) return 'Excellent';
  if (ratio <= 0.85) return 'Moderate';
  if (ratio <= 1.0) return 'Caution';
  return 'Over Goal';
}

export default function EcoGauge({ value, goal, size = 200 }: EcoGaugeProps) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.min(value, goal * 1.2);
  const progress = clampedValue / goal;
  const dashOffset = circumference - Math.min(progress, 1) * circumference;
  const strokeColor = getColorClass(value, goal);
  const statusLabel = getStatusLabel(value, goal);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="rotate-[-90deg]"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e6e9e7"
            strokeWidth={12}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={12}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-[stroke-dashoffset] duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-serif text-4xl font-bold leading-none"
            style={{ color: strokeColor }}
          >
            {value.toFixed(1)}
          </span>
          <span className="mt-1 text-xs font-medium tracking-wide text-on-surface-variant">
            kg CO₂e
          </span>
          <span
            className="mt-2 rounded-full px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wider"
            style={{
              backgroundColor: strokeColor,
              color: '#fff',
            }}
          >
            {statusLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
