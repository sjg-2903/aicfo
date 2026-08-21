import React from 'react';

interface LoadingSkeletonProps {
  height?: string;
  width?: string;
  count?: number;
  circle?: boolean;
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  height = 'h-4',
  width = 'w-full',
  count = 1,
  circle = false,
  className = '',
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${width} ${height} ${
            circle ? 'rounded-full' : 'rounded'
          } bg-gradient-to-r from-slate-200 to-slate-100 animate-pulse`}
        />
      ))}
    </div>
  );
};

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 1 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-6 bg-white rounded-lg border border-slate-200">
          <LoadingSkeleton height="h-6" width="w-1/3" />
          <LoadingSkeleton height="h-8" width="w-1/2" count={1} className="mt-4" />
          <LoadingSkeleton height="h-4" width="w-full" count={2} className="mt-4" />
        </div>
      ))}
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 5,
}) => {
  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="grid gap-4 p-4 border-b border-slate-200" style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
      }}>
        {Array.from({ length: columns }).map((_, i) => (
          <LoadingSkeleton key={i} height="h-4" width="w-full" />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="grid gap-4 p-4 border-b border-slate-100 last:border-b-0"
          style={{
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
          }}
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <LoadingSkeleton key={colIdx} height="h-4" width="w-full" />
          ))}
        </div>
      ))}
    </div>
  );
};
