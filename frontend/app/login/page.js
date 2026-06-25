'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { user, loading, login, register } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState('login');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  async function handleLogin(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    const f = e.target;
    try {
      await login(f.email.value.trim(), f.password.value);
      router.replace('/dashboard');
    } catch (err) {
      setError(err.message); setBusy(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    const f = e.target;
    try {
      await register({
        fullName: f.fullName.value.trim(),
        email: f.email.value.trim(),
        password: f.password.value,
      });
      router.replace('/dashboard');
    } catch (err) {
      setError(err.message); setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-box">
        <div className="auth-logo">
          <span className="auth-logo-mark">P</span>
          <span>PropertyDSS</span>
        </div>
        <h1 className="auth-title">{tab === 'login' ? 'Sign in to your account' : 'Create your account'}</h1>
        <p className="auth-lead">Maintenance fund allocation, prioritised.</p>

        <div className="tabs">
          <button className={`tab ${tab === 'login' ? 'active' : ''}`} onClick={() => { setTab('login'); setError(''); }}>Sign in</button>
          <button className={`tab ${tab === 'register' ? 'active' : ''}`} onClick={() => { setTab('register'); setError(''); }}>Register</button>
        </div>

        {error && <div className="form-alert error">{error}</div>}

        {tab === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className="field">
              <label>Email</label>
              <input name="email" type="email" required placeholder="you@example.com" />
            </div>
            <div className="field">
              <label>Password</label>
              <input name="password" type="password" required placeholder="••••••••" />
            </div>
            <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div className="field">
              <label>Full name</label>
              <input name="fullName" required placeholder="Jane Doe" />
            </div>
            <div className="field">
              <label>Email</label>
              <input name="email" type="email" required placeholder="you@example.com" />
            </div>
            <div className="field">
              <label>Password</label>
              <input name="password" type="password" required minLength={6} placeholder="At least 6 characters" />
            </div>
            <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
            <p className="auth-hint">New accounts are Managers (view-only). Admin access is set up separately.</p>
          </form>
        )}
      </div>
    </div>
  );
}
