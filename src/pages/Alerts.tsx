import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Bell, AlertOctagon, AlertTriangle, Info } from 'lucide-react';
import { Card, PageHeader, Pill, ErrorState } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { getErrorMessage } from '@/lib/axios';
import alertService from '@/services/alertService';

const SEVERITY_STYLE: Record<string, { icon: React.ElementType; color: string; bar: string }> = {
  critical: { icon: AlertOctagon, color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40', bar: 'bg-red-500' },
  high: { icon: AlertTriangle, color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40', bar: 'bg-orange-500' },
  medium: { icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40', bar: 'bg-amber-500' },
  low: { icon: Info, color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40', bar: 'bg-blue-500' },
  info: { icon: Info, color: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800', bar: 'bg-slate-400' },
};

export default function Alerts() {
  const qc = useQueryClient();
  const { addToast } = useToast();
  const { data: alerts, isLoading, error, refetch } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => alertService.getAlerts(),
  });

  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  const markReadMutation = useMutation({
    mutationFn: (id: string) => alertService.markAsRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
      addToast('Alert marked as read', 'success');
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

  const all = alerts || [];
  const filtered = all.filter((a) => {
    if (filter === 'unread') return !a.read;
    if (filter === 'read') return a.read;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Alerts" subtitle="Financial alerts and notifications" />

      <div className="flex gap-2">
        {(['all', 'unread', 'read'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition cursor-pointer ${
              filter === f
                ? 'bg-slate-900 dark:bg-blue-600 text-white'
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {error ? (
        <Card>
          <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.length === 0 && !isLoading && (
            <Card className="p-12 text-center">
              <Bell className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400">No {filter !== 'all' ? filter : ''} alerts.</p>
            </Card>
          )}
          {filtered.map((alert, idx) => {
            const style = SEVERITY_STYLE[alert.severity] || SEVERITY_STYLE.info;
            const Icon = style.icon;
            return (
              <Card key={alert.id} className="p-4 hover flex items-start gap-4" delay={idx * 40}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${style.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <h3 className={`text-sm font-semibold ${alert.read ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>{alert.title}</h3>
                    <Pill value={alert.severity} />
                    {!alert.read && <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.5 rounded-full">NEW</span>}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-1">{alert.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 dark:text-slate-500">{alert.date}</span>
                    <div className="flex items-center gap-3">
                      {!alert.read && (
                        <button onClick={() => markReadMutation.mutate(alert.id)} className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition cursor-pointer">
                          Mark as read
                        </button>
                      )}
                      <Link to={alert.link} className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition">
                        View →
                      </Link>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
