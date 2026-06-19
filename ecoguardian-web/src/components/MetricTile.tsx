import type { LucideIcon } from 'lucide-react';

interface MetricTileProps {
  icon: LucideIcon;
  label: string;
  value: string;
  detail?: string;
  className?: string;
}

export default function MetricTile({
  icon: Icon,
  label,
  value,
  detail,
  className = '',
}: MetricTileProps) {
  return (
    <div
      className={`
        flex items-start gap-3 rounded-xl border border-[#e6e9e7] bg-white/70
        backdrop-blur-sm p-4 transition-all duration-200
        hover:border-[#bcf0ae] hover:shadow-[0_2px_16px_rgba(21,66,18,0.06)]
        ${className}
      `}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#bcf0ae]/40">
        <Icon size={20} className="text-primary" strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wider text-on-surface-variant">
          {label}
        </p>
        <p className="mt-0.5 font-serif text-xl font-bold text-on-surface">
          {value}
        </p>
        {detail && (
          <p className="mt-0.5 text-xs text-on-surface-variant">{detail}</p>
        )}
      </div>
    </div>
  );
}
