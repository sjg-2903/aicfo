import { useState } from 'react';
import { Bell, Globe, Palette, Save } from 'lucide-react';
import { Card, PageHeader } from '@/components/ui';
import { cn } from '@/utils/cn';

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400',
        checked ? 'bg-blue-600' : 'bg-slate-300'
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  );
}

export default function Settings() {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    smsAlerts: false,
    riskAlerts: true,
    weeklyDigest: true,
    theme: 'light',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    language: 'English',
  });
  const [saved, setSaved] = useState(false);

  const toggle = (key: string) =>
    setSettings((s) => ({ ...s, [key]: !(s as any)[key] }));

  const update = (key: string, value: string) => setSettings((s) => ({ ...s, [key]: value }));

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title="Settings" subtitle="Configure preferences and notifications" />

      {/* Notifications */}
      <Card className="p-6">
        <h3 className="text-base font-semibold text-slate-900 mb-5 flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-600" /> Notifications
        </h3>
        <div className="space-y-4">
          <SettingRow label="Email notifications" desc="Receive important updates via email">
            <Toggle checked={settings.emailNotifications} onChange={() => toggle('emailNotifications')} />
          </SettingRow>
          <SettingRow label="Risk alerts" desc="Alert me when financial risks change">
            <Toggle checked={settings.riskAlerts} onChange={() => toggle('riskAlerts')} />
          </SettingRow>
          <SettingRow label="Weekly digest" desc="Get a weekly financial summary">
            <Toggle checked={settings.weeklyDigest} onChange={() => toggle('weeklyDigest')} />
          </SettingRow>
          <SettingRow label="SMS alerts" desc="Urgent alerts via SMS (carrier charges may apply)">
            <Toggle checked={settings.smsAlerts} onChange={() => toggle('smsAlerts')} />
          </SettingRow>
        </div>
      </Card>

      {/* Preferences */}
      <Card className="p-6">
        <h3 className="text-base font-semibold text-slate-900 mb-5 flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-600" /> Preferences
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="text-sm font-medium text-slate-600 block mb-1.5">Currency</label>
            <select value={settings.currency} onChange={(e) => update('currency', e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400">
              <option>INR</option><option>USD</option><option>EUR</option><option>GBP</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600 block mb-1.5">Timezone</label>
            <select value={settings.timezone} onChange={(e) => update('timezone', e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400">
              <option>Asia/Kolkata</option><option>Asia/Dubai</option><option>UTC</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600 block mb-1.5">Language</label>
            <select value={settings.language} onChange={(e) => update('language', e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400">
              <option>English</option><option>Hindi</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600 block mb-1.5 flex items-center gap-2"><Palette className="w-4 h-4" /> Theme</label>
            <div className="flex gap-2">
              {['light', 'dark'].map((t) => (
                <button
                  key={t}
                  onClick={() => update('theme', t)}
                  className={cn('px-4 py-2.5 rounded-lg text-sm font-medium capitalize transition', settings.theme === t ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <button onClick={save} className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition">
          <Save className="w-4 h-4" /> Save Settings
        </button>
        {saved && <span className="text-sm text-green-600 animate-in">✓ Settings saved</span>}
      </div>
    </div>
  );
}

function SettingRow({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="text-xs text-slate-400">{desc}</p>
      </div>
      {children}
    </div>
  );
}
