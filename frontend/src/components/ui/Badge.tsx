import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'cyan' | 'emerald' | 'rose' | 'amber' | 'btc' | 'slate';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'cyan',
  size = 'md',
  className = ''
}) => {
  const variantStyles = {
    cyan: 'bg-intel-cyan/15 text-intel-cyan border-intel-cyan/30',
    emerald: 'bg-intel-emerald/15 text-intel-emerald border-intel-emerald/30',
    rose: 'bg-intel-rose/15 text-intel-rose border-intel-rose/30',
    amber: 'bg-intel-amber/15 text-intel-amber border-intel-amber/30',
    btc: 'bg-btc-primary/15 text-btc-primary border-btc-primary/30',
    slate: 'bg-slate-800/60 text-slate-300 border-slate-700/60',
  };

  const sizeStyles = {
    sm: 'px-1.5 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono font-medium rounded-md border ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
};
