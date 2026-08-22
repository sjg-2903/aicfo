import { useState, useEffect } from 'react';
import { Bell, Globe, Palette, Save, BrainCircuit, Sparkles, Check } from 'lucide-react';
import { Card, PageHeader } from '@/components/ui';
import SegmentStepsGuide from '@/components/SegmentStepsGuide';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/utils/cn';

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400',
        checked ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
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
  const { theme, setTheme } = useTheme();

  const [settings, setSettings] = useState({
    emailNotifications: true,
    smsAlerts: false,
    riskAlerts: true,
    weeklyDigest: true,
    aiEngine: 'gemini', // 'gemini' | 'openai'
    theme: theme || 'light',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    language: 'English',
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSettings((s) => ({ ...s, theme }));
  }, [theme]);

  const toggle = (key: string) =>
    setSettings((s) => ({ ...s, [key]: !(s as any)[key] }));

  const update = (key: string, value: string) => {
    setSettings((s) => ({ ...s, [key]: value }));
    if (key === 'theme' && (value === 'light' || value === 'dark')) {
      setTheme(value);
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    setSettings((s) => ({ ...s, theme: newTheme }));
  };

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title="Settings" subtitle="Configure preferences, AI models and notifications" />

      {/* Segment Steps Guide */}
      <SegmentStepsGuide segment="settings" defaultExpanded={false} />

      {/* AI Model Intelligence Config */}
      <Card className="p-6 border-blue-100 dark:border-slate-800">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-blue-600 dark:text-blue-400" /> AI Narrative &amp; Recommendation Engine
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Select the primary artificial intelligence provider for conversational chat, file extraction, and strategic recommendations.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <button
            type="button"
            onClick={() => update('aiEngine', 'gemini')}
            className={`p-4 rounded-xl border text-left transition cursor-pointer ${
              settings.aiEngine === 'gemini'
                ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/30 ring-2 ring-blue-500/20'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600" /> Google Gemini 2.5 Flash
              </span>
              {settings.aiEngine === 'gemini' && (
                <span className="p-0.5 rounded-full bg-blue-600 text-white">
                  <Check className="w-3.5 h-3.5" />
                </span>
              )}
            </div>
            <span className="inline-block text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full mb-1.5">
              Default Primary (Fast &amp; Multimodal)
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Ultra-fast latency, high multimodal capacity for invoice/bill image review, and deep reasoning over Indian MSME ledgers.
            </p>
          </button>

          <button
            type="button"
            onClick={() => update('aiEngine', 'openai')}
            className={`p-4 rounded-xl border text-left transition cursor-pointer ${
              settings.aiEngine === 'openai'
                ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/30 ring-2 ring-blue-500/20'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <BrainCircuit className="w-4 h-4 text-indigo-600" /> OpenAI GPT-4.1 Mini
              </span>
              {settings.aiEngine === 'openai' && (
                <span className="p-0.5 rounded-full bg-blue-600 text-white">
                  <Check className="w-3.5 h-3.5" />
                </span>
              )}
            </div>
            <span className="inline-block text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/50 px-2 py-0.5 rounded-full mb-1.5">
              Secondary Failover
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              High precision narrative generation and structured JSON parsing. Used as automatic failover.
            </p>
          </button>
        </div>

        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          * AI providers only receive already-calculated financial telemetry. Core calculations, ratios, and risk formulas run deterministically in backend Python.
        </p>
      </Card>

      {/* Notifications */}
      <Card className="p-6">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Notifications
        </h3>
        <div className="space-y-4">
          <SettingRow label="Email notifications" desc="Receive important updates via email">
            <Toggle checked={settings.emailNotifications} onChange={() => toggle('emailNotifications')} />
          </SettingRow>
          <SettingRow label="Risk alerts" desc="Alert me when financial risks change">
            <Toggle checked={settings.riskAlerts} onChange={() => toggle('riskAlerts')} />
          </SettingRow>
          <SettingRow label="Weekly digest" desc="Get a weekly financial report & recommendations">
            <Toggle checked={settings.weeklyDigest} onChange={() => toggle('weeklyDigest')} />
          </SettingRow>
          <SettingRow label="SMS alerts" desc="Urgent alerts via SMS (carrier charges may apply)">
            <Toggle checked={settings.smsAlerts} onChange={() => toggle('smsAlerts')} />
          </SettingRow>
        </div>
      </Card>

      {/* Preferences */}
      <Card className="p-6">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Preferences
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="text-sm font-medium text-slate-600 dark:text-slate-300 block mb-1.5">Currency</label>
            <select
              value={settings.currency}
              onChange={(e) => update('currency', e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm outline-none focus:border-blue-400"
            >
              <option>INR</option>
              <option>USD</option>
              <option>EUR</option>
              <option>GBP</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600 dark:text-slate-300 block mb-1.5">Timezone</label>
            <select
              value={settings.timezone}
              onChange={(e) => update('timezone', e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm outline-none focus:border-blue-400"
            >
              <option>Asia/Kolkata</option>
              <option>Asia/Dubai</option>
              <option>UTC</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600 dark:text-slate-300 block mb-1.5">Language</label>
            <select
              value={settings.language}
              onChange={(e) => update('language', e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm outline-none focus:border-blue-400"
            >
              <option>English</option>
              <option>Hindi</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600 dark:text-slate-300 block mb-1.5 flex items-center gap-2">
              <Palette className="w-4 h-4" /> Theme
            </label>
            <div className="flex gap-2">
              {(['light', 'dark'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleThemeChange(t)}
                  className={cn(
                    'px-4 py-2.5 rounded-lg text-sm font-medium capitalize transition cursor-pointer',
                    theme === t
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-200 dark:shadow-none font-semibold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <button onClick={save} className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition cursor-pointer">
          <Save className="w-4 h-4" /> Save Settings
        </button>
        {saved && <span className="text-sm text-green-600 dark:text-green-400 animate-in">✓ Settings saved</span>}
      </div>
    </div>
  );
}

function SettingRow({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-50 dark:border-slate-800/60 last:border-0">
      <div>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{label}</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">{desc}</p>
      </div>
      {children}
    </div>
  );
}

