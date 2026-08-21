import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Bell, Search, ChevronDown, LogOut, Settings, Building2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/utils/cn';
import { mockAlerts } from '@/mock';

export default function Topbar({ onMenuToggle }: { onMenuToggle: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = mockAlerts.filter((a) => !a.read).length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur border-b border-slate-200 flex items-center gap-3 px-4 sm:px-6">
      {/* Mobile menu toggle */}
      <button
        onClick={onMenuToggle}
        className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition"
        aria-label="Toggle navigation"
      >
        <Menu className="w-5 h-5 text-slate-600" />
      </button>

      {/* Business name + date */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">{user?.business_name || 'Acme Industries'}</p>
        <p className="text-xs text-slate-500 hidden sm:block">{dateStr}</p>
      </div>

      {/* Search (desktop) */}
      <div className="hidden md:flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2 w-64">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          placeholder="Search…"
          className="bg-transparent text-sm outline-none placeholder:text-slate-400 w-full"
        />
      </div>

      {/* Notifications */}
      <div className="relative" ref={notifRef}>
        <button
          onClick={() => setNotifOpen(!notifOpen)}
          className="relative p-2 rounded-lg hover:bg-slate-100 transition"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5 text-slate-600" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>

        {notifOpen && (
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden animate-in">
            <div className="p-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {mockAlerts.slice(0, 5).map((alert) => (
                <Link
                  key={alert.id}
                  to={alert.link}
                  onClick={() => setNotifOpen(false)}
                  className="flex items-start gap-3 p-3 hover:bg-slate-50 transition border-b border-slate-50 last:border-0"
                >
                  <span
                    className={cn(
                      'mt-1 w-2 h-2 rounded-full shrink-0',
                      alert.severity === 'critical' && 'bg-red-500',
                      alert.severity === 'high' && 'bg-orange-500',
                      alert.severity === 'medium' && 'bg-amber-500',
                      alert.severity === 'low' && 'bg-blue-500',
                      alert.severity === 'info' && 'bg-slate-400'
                    )}
                  />
                  <div className="min-w-0">
                    <p className={cn('text-sm', alert.read ? 'text-slate-500' : 'text-slate-900 font-medium')}>
                      {alert.title}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{alert.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Profile menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition"
        >
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
            {user?.owner_name?.charAt(0) || 'A'}
          </div>
          <ChevronDown className="w-4 h-4 text-slate-500 hidden sm:block" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden animate-in">
            <div className="p-3 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-900">{user?.owner_name || 'Owner'}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email || 'owner@acme.com'}</p>
            </div>
            <div className="p-1">
              <Link to="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition">
                <Building2 className="w-4 h-4" /> Business Profile
              </Link>
              <Link to="/settings" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition">
                <Settings className="w-4 h-4" /> Settings
              </Link>
              <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition">
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
