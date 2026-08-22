import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Info } from 'lucide-react';
import { cn } from '@/utils/cn';

interface KPICardProps {
  title: string;
  value: number;
  unit?: string;
  trend?: number;
  trendLabel?: string;
  icon?: React.ReactNode;
  tooltip?: string;
  loading?: boolean;
  format?: 'currency' | 'number' | 'percentage';
  prefix?: string;
  suffix?: string;
  className?: string;
  onClick?: () => void;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  unit,
  trend,
  trendLabel,
  icon,
  tooltip,
  loading = false,
  format = 'currency',
  prefix = '',
  suffix = '',
  className,
  onClick,
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!loading) {
      const duration = 800;
      const start = Date.now();
      const startValue = displayValue;
      const diff = value - startValue;

      const animate = () => {
        const now = Date.now();
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        setDisplayValue(startValue + diff * progress);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setDisplayValue(value);
        }
      };

      animate();
    }
  }, [value, loading]);

  const formatValue = (val: number) => {
    if (format === 'currency') {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
      }).format(val);
    } else if (format === 'percentage') {
      return `${val.toFixed(1)}%`;
    } else {
      return new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 0,
      }).format(val);
    }
  };

  const trendPositive = trend !== undefined && trend >= 0;
  const trendPercentage = trend !== undefined ? Math.abs(trend) : 0;

  return (
    <div
      className={cn(
        'p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:shadow-lg transition-all duration-300',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</p>
            {tooltip && (
              <div className="group relative">
                <Info className="w-4 h-4 text-slate-400 dark:text-slate-500 cursor-help" />
                <div className="hidden group-hover:block absolute z-10 top-full left-0 mt-2 bg-slate-900 dark:bg-slate-800 border border-slate-700 text-white text-xs rounded p-2 w-48 shadow-lg">
                  {tooltip}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            {prefix && <span className="text-sm text-slate-500 dark:text-slate-400">{prefix}</span>}
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              {loading ? '···' : formatValue(displayValue)}
            </p>
            {suffix && <span className="text-sm text-slate-500 dark:text-slate-400">{suffix}</span>}
            {unit && <span className="text-sm text-slate-500 dark:text-slate-400">{unit}</span>}
          </div>
        </div>

        {icon && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-lg text-blue-600 dark:text-blue-400">{icon}</div>
        )}
      </div>

      {trend !== undefined && !loading && (
        <div className="flex items-center gap-1">
          {trendPositive ? (
            <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
          )}
          <span className={trendPositive ? 'text-green-600 dark:text-green-400 font-medium' : 'text-red-600 dark:text-red-400 font-medium'}>
            {trendPositive ? '+' : '-'}{trendPercentage.toFixed(1)}%
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {trendLabel || 'vs previous period'}
          </span>
        </div>
      )}

      {trend === undefined && trendLabel && !loading && (
        <div className="text-xs text-slate-500 dark:text-slate-400">{trendLabel}</div>
      )}
    </div>
  );
};
