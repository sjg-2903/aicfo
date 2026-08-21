import React from 'react';
import { cn } from '@/utils/cn';

type BadgeStatus = 
  | 'success' | 'error' | 'warning' | 'info'
  | 'paid' | 'unpaid' | 'overdue' | 'draft' | 'sent' | 'cancelled'
  | 'active' | 'inactive' | 'closed' | 'pending'
  | 'critical' | 'high' | 'medium' | 'low'
  | 'good' | 'moderate' | 'at_risk'
  | 'resolved' | 'acknowledged' | 'new';

const statusStyles: Record<BadgeStatus, { bg: string; text: string; border: string }> = {
  // Financial statuses
  success: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  error: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  warning: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  info: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },

  // Invoice statuses
  paid: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  unpaid: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  overdue: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  draft: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
  sent: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  cancelled: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },

  // Loan statuses
  active: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  inactive: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
  closed: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },

  // Risk/Severity levels
  critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  high: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  medium: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  low: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },

  // Health scores
  good: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  moderate: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  at_risk: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },

  // Alert statuses
  resolved: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  acknowledged: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  new: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
};

interface StatusBadgeProps {
  status: BadgeStatus;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'filled' | 'outline';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'md',
  variant = 'outline',
  className,
}) => {
  const style = statusStyles[status] || statusStyles.info;
  const capitalizedLabel = label || status.replace(/_/g, ' ').charAt(0).toUpperCase() + status.replace(/_/g, ' ').slice(1);

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  if (variant === 'filled') {
    return (
      <span
        className={cn(
          sizeClasses[size],
          style.bg,
          style.text,
          'rounded-full font-medium whitespace-nowrap',
          className
        )}
      >
        {capitalizedLabel}
      </span>
    );
  }

  return (
    <span
      className={cn(
        sizeClasses[size],
        style.bg,
        style.text,
        'rounded-full font-medium whitespace-nowrap border',
        style.border,
        className
      )}
    >
      {capitalizedLabel}
    </span>
  );
};
