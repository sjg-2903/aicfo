import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Save } from 'lucide-react';
import { Card, PageHeader, ErrorState } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { getErrorMessage } from '@/lib/axios';
import profileService from '@/services/profileService';

export default function Profile() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { addToast } = useToast();

  const { data: profile, isLoading, error, refetch } = useQuery({
    queryKey: ['business'],
    queryFn: () => profileService.getProfile(),
  });

  const [form, setForm] = useState({
    businessName: '',
    businessType: '',
    industry: '',
    gstin: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    annualTurnover: '',
    employeeCount: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        businessName: profile.businessName || user?.business_name || '',
        businessType: profile.businessType,
        industry: profile.industry,
        gstin: profile.gstin,
        email: profile.email || user?.email || '',
        phone: profile.phone,
        city: profile.city,
        state: profile.state,
        annualTurnover: profile.annualTurnover ? String(profile.annualTurnover) : '',
        employeeCount: profile.employeeCount ? String(profile.employeeCount) : '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: () =>
      profileService.updateProfile({
        business_name: form.businessName,
        business_type: form.businessType,
        industry: form.industry,
        gstin: form.gstin,
        email: form.email,
        phone: form.phone,
        city: form.city,
        state: form.state,
        annual_turnover: form.annualTurnover ? Number(form.annualTurnover) : undefined,
        employee_count: form.employeeCount ? Number(form.employeeCount) : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business'] });
      addToast('Profile saved', 'success');
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
    onSettled: () => setSaving(false),
  });

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const fields = [
    { key: 'businessName', label: 'Business Name', type: 'text' },
    { key: 'businessType', label: 'Business Type', type: 'text' },
    { key: 'industry', label: 'Industry', type: 'text' },
    { key: 'gstin', label: 'GSTIN', type: 'text' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'phone', label: 'Phone', type: 'text' },
    { key: 'city', label: 'City', type: 'text' },
    { key: 'state', label: 'State', type: 'text' },
    { key: 'annualTurnover', label: 'Annual Turnover (₹)', type: 'number' },
    { key: 'employeeCount', label: 'Employees', type: 'number' },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title="Business Profile" subtitle="Manage your business information" />

      {error ? (
        <Card>
          <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />
        </Card>
      ) : (
        <Card className="p-6">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
            <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900">{form.businessName || '—'}</p>
              <p className="text-sm text-slate-500">
                {form.industry || '—'} · {form.businessType || '—'}
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {fields.map((f) => (
                <div key={f.key}>
                  <label className="text-sm font-medium text-slate-600 block mb-1.5">{f.label}</label>
                  <input
                    type={f.type}
                    value={(form as Record<string, string>)[f.key]}
                    onChange={(e) => update(f.key, e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={() => {
                setSaving(true);
                saveMutation.mutate();
              }}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-sm font-medium transition"
            >
              <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
