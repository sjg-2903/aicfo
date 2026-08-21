import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, AlertOctagon, AlertTriangle, Info } from 'lucide-react';
import { Card, PageHeader, Pill } from '@/components/ui';
import { mockAlerts } from '@/mock';

const SEVERITY_STYLE: Record<string, { icon: React.ElementType; color: string; bar: string }> = {
  critical: { icon: AlertOctagon, color: 'text-red-600 bg-red-50', bar: 'bg-red-500' },
  high: { icon: AlertTriangle, color: 'text-orange-600 bg-orange-50', bar: 'bg-orange-500' },
  medium: { icon: AlertTriangle, color: 'text-amber-600 bg-amber-50', bar: 'bg-amber-500' },
  low: { icon: Info, color: 'text-blue-600 bg-blue-50', bar: 'bg-blue-500' },
  info: { icon: Info, color: 'text-slate-600 bg-slate-100', bar: 'bg-slate-400' },
};

export default function Alerts() {
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [alerts, setAlerts] = useState(mockAlerts);

  const filtered = alerts.filter((a) => {
    if (filter === 'unread') return !a.read;
    if (filter === 'read') return a.read;
    return true;
  });

  const markRead = (id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Alerts" subtitle="Financial alerts and notifications" />

      <div className="flex gap-2">
        {(['all', 'unread', 'read'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition ${filter === f ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
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
                  <h3 className={`text-sm font-semibold ${alert.read ? 'text-slate-500' : 'text-slate-900'}`}>{alert.title}</h3>
                  <Pill value={alert.severity} />
                  {!alert.read && <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">NEW</span>}
                </div>
                <p className="text-sm text-slate-600 mb-1">{alert.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">{alert.date}</span>
                  <div className="flex items-center gap-3">
                    {!alert.read && (
                      <button onClick={() => markRead(alert.id)} className="text-xs font-medium text-blue-600 hover:text-blue-700 transition">
                        Mark as read
                      </button>
                    )}
                    <Link to={alert.link} className="text-xs font-medium text-slate-500 hover:text-slate-700 transition">
                      View →
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <Card className="p-12 text-center">
          <Bell className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No {filter !== 'all' ? filter : ''} alerts.</p>
        </Card>
      )}
    </div>
  );
}
