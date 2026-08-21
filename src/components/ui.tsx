import React from 'react';
import { cn } from '@/utils/cn';
import { AlertCircle, Inbox, RefreshCw } from 'lucide-react';

/** Card wrapper with subtle hover + entrance animation */
export function Card({
  className,
  children,
  hover = false,
  delay = 0,
}: {
  className?: string;
  children: React.ReactNode;
  hover?: boolean;
  delay?: number;
}) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-slate-200 shadow-sm',
        'animate-in',
        hover && 'transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:border-blue-200',
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/** Chart card with title, subtitle, actions and body */
export function ChartCard({
  title,
  subtitle,
  children,
  className,
  actions,
  delay = 0,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
  delay?: number;
}) {
  return (
    <Card className={cn('p-5 sm:p-6', className)} delay={delay} hover>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            {title && <h3 className="text-base font-semibold text-slate-900">{title}</h3>}
            {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </Card>
  );
}

/** Section header used at top of each page */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div className="animate-in">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

/** Status pill for severity / levels */
const severityStyles: Record<string, { bg: string; text: string; dot: string }> = {
  info: { bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-400' },
  low: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  medium: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  high: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  critical: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  good: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  moderate: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  at_risk: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  strong: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  weak: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  completed: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  upcoming: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  overdue: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  paid: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  sent: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  draft: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  active: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  acknowledged: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  new: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  in_progress: { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
  open: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  resolved: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  ready: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  not_ready: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
};

export function Pill({ value, label }: { value: string; label?: string }) {
  const style = severityStyles[value] || severityStyles.info;
  const display = label || value.replace(/_/g, ' ');
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium capitalize',
        style.bg,
        style.text
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', style.dot)} />
      {display}
    </span>
  );
}

/** Score ring with animated fill */
export function ScoreRing({
  score,
  size = 140,
  stroke = 10,
  label,
  color,
}: {
  score: number;
  size?: number;
  stroke?: number;
  label?: string;
  color?: string;
}) {
  const [display, setDisplay] = React.useState(0);
  React.useEffect(() => {
    const duration = 1000;
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const p = Math.min(elapsed / duration, 1);
      // ease out cubic
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(score * eased);
      if (p >= 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [score]);

  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (display / 100) * circumference;
  const autoColor =
    color ||
    (score >= 75 ? '#10b981' : score >= 55 ? '#f59e0b' : score >= 35 ? '#f97316' : '#ef4444');

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={autoColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.05s linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-bold text-slate-900" style={{ fontSize: size * 0.24 }}>
          {Math.round(display)}
        </span>
        {label && <span className="text-xs text-slate-500 font-medium">{label}</span>}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4 animate-in">
      <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
        {icon || <Inbox className="w-7 h-7" />}
      </div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {description && <p className="text-sm text-slate-500 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-4">
        <AlertCircle className="w-7 h-7" />
      </div>
      <h3 className="text-base font-semibold text-slate-900">Something went wrong</h3>
      <p className="text-sm text-slate-500 mt-1">{message || 'Unable to load data. Please try again.'}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      )}
    </div>
  );
}

export function ProgressBar({
  value,
  color,
  className,
}: {
  value: number;
  color?: string;
  className?: string;
}) {
  return (
    <div className={cn('w-full bg-slate-100 rounded-full h-2 overflow-hidden', className)}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min(value, 100)}%`, background: color || '#2563eb' }}
      />
    </div>
  );
}
