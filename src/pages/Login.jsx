import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';
import { Dumbbell } from 'lucide-react';

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ email: '', password: '', full_name: '', user_type: 'independent', beta_key: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const ACCOUNT_TYPES = [
    { value: 'independent', label: 'Solo athlete', hint: 'Train on your own — free signup.' },
    { value: 'client', label: 'Client', hint: 'Invite-only: sign up with the email your trainer used to add you.' },
    { value: 'trainer', label: 'Trainer', hint: 'Requires a beta key.' },
  ];

  const next = new URLSearchParams(window.location.search).get('next');

  const routeForUser = (user) => {
    if (user?.user_type === 'client') return createPageUrl('ClientDashboard');
    if (user?.user_type === 'independent') return createPageUrl('IndependentDashboard');
    return createPageUrl('Dashboard');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user =
        mode === 'login'
          ? await login(form.email, form.password)
          : await register(form);
      const dest = next && next.startsWith('/') ? next : routeForUser(user);
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Dumbbell className="w-7 h-7 text-foreground" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-wide text-foreground">ApexCoach</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
          </p>
        </div>

        <form
          onSubmit={submit}
          className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm"
        >
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-sm text-muted-foreground mb-2">I am a…</label>
                <div className="grid grid-cols-3 gap-2">
                  {ACCOUNT_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setForm({ ...form, user_type: t.value })}
                      className={`rounded-xl border px-2 py-2.5 text-sm font-semibold transition ${
                        form.user_type === t.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-secondary text-muted-foreground hover:border-primary/40'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {ACCOUNT_TYPES.find((t) => t.value === form.user_type)?.hint}
                </p>
              </div>
              {form.user_type === 'trainer' && (
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Beta key</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ACOACH-XXXXXXXX"
                    value={form.beta_key}
                    onChange={(e) => setForm({ ...form, beta_key: e.target.value.toUpperCase() })}
                    className="w-full rounded-lg bg-background border border-border px-3 py-2 text-foreground outline-none focus:border-primary uppercase tracking-wider"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Full name</label>
                <input
                  type="text"
                  required
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="w-full rounded-lg bg-background border border-border px-3 py-2 text-foreground outline-none focus:border-primary"
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-lg bg-background border border-border px-3 py-2 text-foreground outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-lg bg-background border border-border px-3 py-2 text-foreground outline-none focus:border-primary"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary py-2.5 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60 transition"
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>

          <p className="text-center text-sm text-muted-foreground">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError('');
              }}
              className="text-emerald-400 hover:underline font-medium"
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
