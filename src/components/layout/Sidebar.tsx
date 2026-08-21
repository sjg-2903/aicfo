import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  HeartPulse,
  ArrowLeftRight,
  FileText,
  Receipt,
  Landmark,
  Banknote,
  TrendingUp,
  ShieldAlert,
  Gauge,
  Sparkles,
  Lightbulb,
  Bell,
  FileBarChart,
  History,
  Building2,
  Settings,
  X,
  BrainCircuit,
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  group: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Overview' },
  { to: '/financial-health', label: 'Financial Health', icon: HeartPulse, group: 'Overview' },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight, group: 'Finance' },
  { to: '/invoices', label: 'Invoices', icon: FileText, group: 'Finance' },
  { to: '/expenses', label: 'Expenses', icon: Receipt, group: 'Finance' },
  { to: '/gst', label: 'GST & Tax', icon: Landmark, group: 'Finance' },
  { to: '/loans', label: 'Loans', icon: Banknote, group: 'Finance' },
  { to: '/cash-flow', label: 'Cash Flow', icon: TrendingUp, group: 'Intelligence' },
  { to: '/risk-analysis', label: 'Risk Analysis', icon: ShieldAlert, group: 'Intelligence' },
  { to: '/loan-readiness', label: 'Loan Readiness', icon: Gauge, group: 'Intelligence' },
  { to: '/ai-cfo', label: 'AI CFO', icon: Sparkles, group: 'Intelligence' },
  { to: '/recommendations', label: 'Recommendations', icon: Lightbulb, group: 'Actions' },
  { to: '/alerts', label: 'Alerts', icon: Bell, group: 'Actions' },
  { to: '/reports', label: 'Reports', icon: FileBarChart, group: 'Actions' },
  { to: '/history', label: 'History', icon: History, group: 'Actions' },
];

const SETTINGS_ITEMS: NavItem[] = [
  { to: '/profile', label: 'Business Profile', icon: Building2, group: 'Management' },
  { to: '/settings', label: 'Settings', icon: Settings, group: 'Management' },
];

function NavGroup({ title, items, onNavigate }: { title: string; items: NavItem[]; onNavigate?: () => void }) {
  return (
    <div className="mb-2">
      <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </p>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'group relative flex items-center gap-3 px-3 py-2 mb-0.5 rounded-lg text-sm font-medium transition-all duration-200',
              isActive
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-600 rounded-r-full" />
              )}
              <item.icon className={cn('w-[18px] h-[18px] shrink-0', isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600')} />
              <span className="truncate">{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </div>
  );
}

export default function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const location = useLocation();
  void location;

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden animate-in"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed z-50 inset-y-0 left-0 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
              <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold text-slate-900">AI CFO</p>
              <p className="text-[10px] text-slate-500 font-medium">for MSMEs</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <NavGroup title="Overview" items={NAV_ITEMS.filter((i) => i.group === 'Overview')} onNavigate={onClose} />
          <NavGroup title="Finance" items={NAV_ITEMS.filter((i) => i.group === 'Finance')} onNavigate={onClose} />
          <NavGroup title="Intelligence" items={NAV_ITEMS.filter((i) => i.group === 'Intelligence')} onNavigate={onClose} />
          <NavGroup title="Actions" items={NAV_ITEMS.filter((i) => i.group === 'Actions')} onNavigate={onClose} />
          <NavGroup title="Management" items={SETTINGS_ITEMS} onNavigate={onClose} />
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Data synced just now
          </div>
        </div>
      </aside>
    </>
  );
}
