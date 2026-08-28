import type { ReactNode } from 'react';

type BrandWordmarkProps = {
  subtitle?: string;
  className?: string;
  compact?: boolean;
  trailing?: ReactNode;
};

export function BrandWordmark({
  subtitle = 'Home upkeep, organized',
  className = '',
  compact = false,
  trailing,
}: BrandWordmarkProps) {
  return (
    <div className={`brand-lockup brand-wordmark ${compact ? 'compact' : ''} ${className}`.trim()}>
      <div className="brand-mark" aria-hidden="true">
        <span>H</span>
      </div>
      <div className="brand-wordmark-copy">
        <span className="brand-wordmark-name">HUPKEEP</span>
        {subtitle ? <span className="brand-wordmark-subtitle">{subtitle}</span> : null}
      </div>
      {trailing}
    </div>
  );
}
