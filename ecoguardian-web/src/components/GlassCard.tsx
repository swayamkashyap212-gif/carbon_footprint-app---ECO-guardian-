import { type ReactNode } from 'react';

type Tone = 'default' | 'green' | 'red' | 'blue';

interface GlassCardProps {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

const toneStyles: Record<Tone, string> = {
  default: 'bg-white/80 border-white/60',
  green: 'bg-[rgba(188,240,174,0.4)] border-[#bcf0ae]',
  red: 'bg-[#fee2e2] border-[#fecaca]',
  blue: 'bg-[#e0f2fe] border-[#bae6fd]',
};

export default function GlassCard({
  children,
  tone = 'default',
  className = '',
  onClick,
  style,
}: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={`
        rounded-2xl border backdrop-blur-md
        shadow-[0_4px_30px_rgba(0,0,0,0.06)]
        transition-all duration-300 ease-out
        ${toneStyles[tone]}
        ${onClick ? 'cursor-pointer hover:shadow-[0_8px_40px_rgba(21,66,18,0.12)] hover:scale-[1.015]' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
