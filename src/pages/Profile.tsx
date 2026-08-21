import { useState } from 'react';
import { Building2, Save } from 'lucide-react';
import { Card, PageHeader } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';

export default function Profile() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    businessName: user?.business_name || 'Acme Industries Pvt. Ltd.',
    businessType: 'Private Limited',
    industry: 'Manufacturing',
    gstin: '18AABCT1234H1Z0',
    email: user?.email || 'owner@acmeindustries.com',
    phone: '+91 98765 43210',
    city: 'Bengaluru',
    state: 'Karnataka',
    annualTurnover: '₹4.8 Cr',
    employeeCount: '45',
  });
  const [saved, setSaved] = useState(false);

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const fields = [
    { key: 'businessName', label: 'Business Name', type: 'text' },
    { key: 'businessType', label: 'Business Type', type: 'text' },
    { key: 'industry', label: 'Industry', type: 'text' },
    { key: 'gstin', label: 'GSTIN', type: 'text' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'phone', label: 'Phone', type: 'text' },
    { key: 'city', label: 'City', type: 'text' },
    { key: 'state', label: 'State', type: 'text' },
    { key: 'annualTurnover', label: 'Annual Turnover', type: 'text' },
    { key: 'employeeCount', label: 'Employees', type: 'text' },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title="Business Profile" subtitle="Manage your business information" />

      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
          <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-900">{form.businessName}</p>
            <p className="text-sm text-slate-500">{form.industry} · {form.businessType}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="text-sm font-medium text-slate-600 block mb-1.5">{f.label}</label>
              <input
                type={f.type}
                value={(form as any)[f.key]}
                onChange={(e) => update(f.key, e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
              />
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button onClick={save} className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition">
            <Save className="w-4 h-4" /> Save Changes
          </button>
          {saved && <span className="text-sm text-green-600 animate-in">✓ Profile saved</span>}
        </div>
      </Card>
    </div>
  );
}
