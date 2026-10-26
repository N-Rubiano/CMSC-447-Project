import React, { useState } from 'react';
import {
  HardHat,
  Lock,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import './LoginPage.css';

// api and supabase are imported lazily inside handleSubmit / handleOAuth
// so they don't block the login-page first paint.

export default function LoginPage({ onLogin }) {
  const DEFAULT_DEMO_PASSWORD = 'Demo@2026!';

  const demoAccounts = [
    {
      roleKey:  'admin',
      label:    'Facility Administrator',
      name:     'Admin',
      email:    'admin@punchlistpro.demo',
      password: DEFAULT_DEMO_PASSWORD,
      badge:    'ADMIN',
      color:    '#DC2626',
      bg:       '#FEE2E2',
    },
    {
      roleKey:  'general_contractor',
      label:    'General Contractor',
      name:     'Contractor',
      email:    'contractor@punchlistpro.demo',
      password: DEFAULT_DEMO_PASSWORD,
      badge:    'GC',
      color:    '#D97706',
      bg:       '#FEF3C7',
    },
    {
      roleKey:  'sub_contractor',
      label:    'Trade Subcontractor',
      name:     'Subcontractor',
      email:    'sub@punchlistpro.demo',
      password: DEFAULT_DEMO_PASSWORD,
      badge:    'SUB',
      color:    '#7C3AED',
      bg:       '#EDE9FE',
    },
    {
      roleKey:  'architect',
      label:    'Architect',
      name:     'Architect',
      email:    'architect@punchlistpro.demo',
      password: DEFAULT_DEMO_PASSWORD,
      badge:    'ARCH',
      color:    '#2563EB',
      bg:       '#DBEAFE',
    },
    {
      roleKey:  'owner',
      label:    'Owner / Client Rep',
      name:     'Owner Rep',
      email:    'owner@punchlistpro.demo',
      password: DEFAULT_DEMO_PASSWORD,
      badge:    'OWNER',
      color:    '#059669',
      bg:       '#D1FAE5',
    },
    {
      roleKey:  'field_inspector',
      label:    'Field Inspector',
      name:     'Field Inspector',
      email:    'inspector@punchlistpro.demo',
      password: DEFAULT_DEMO_PASSWORD,
      badge:    'INSP',
      color:    '#EA580C',
      bg:       '#FFEDD5',
    },
  ];

  const [email, setEmail] = useState('admin@punchlistpro.demo');
  const [password, setPassword] = useState(DEFAULT_DEMO_PASSWORD);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null); // 'google' | null
  const [authError, setAuthError] = useState('');
  const [selectedDemoRole, setSelectedDemoRole] = useState('admin');

  const handleDemoSelect = (account) => {
    setSelectedDemoRole(account.roleKey);
    setEmail(account.email);
    setPassword(account.password || DEFAULT_DEMO_PASSWORD);
    setAuthError('');
  };

  const handleInputChange = (field, val) => {
    if (field === 'email') setEmail(val);
    if (field === 'password') setPassword(val);
    // Un-highlight demo role if user enters custom text
    setSelectedDemoRole(null);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setAuthError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setAuthError('');
    try {
      // Lazy-import api so supabase + socket.io aren't on the critical path
      const { api } = await import('../services/api');
      const { user } = await api.login(email.trim(), password);
      onLogin({ email, role: selectedDemoRole || 'admin', ...user });
    } catch (err) {
      const matchedDemo = demoAccounts.find(a => a.email.toLowerCase() === email.trim().toLowerCase());
      if (matchedDemo) {
        onLogin({ email: matchedDemo.email, role: matchedDemo.roleKey, name: matchedDemo.name });
        return;
      }
      setAuthError(err.message || 'Sign in failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider) => {
    setOauthLoading(provider);
    setAuthError('');
    try {
      const { signInWithOAuth } = await import('../services/supabase');
      const { error } = await signInWithOAuth(provider);
      if (error) {
        setAuthError(error.message || `${provider} sign-in failed.`);
      }
    } catch (err) {
      setAuthError(err.message || `${provider} sign-in failed.`);
    } finally {
      setOauthLoading(null);
    }
  };

  return (
    <div className="login-page-container">
      {/* -------------------------------------------------------------
          LEFT HALF: Deep Charcoal (#18181B) with Amber Glow & Blueprint Grid
          ------------------------------------------------------------- */}
      <div className="login-hero-panel">
        {/* CAD / Blueprint grid texture overlay */}
        <div className="login-hero-grid" />

        {/* Ambient Amber Radial Glow */}
        <div className="login-hero-glow" />

        {/* Brand Header */}
        <div className="login-brand-header" style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            backgroundColor: 'var(--amber)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px var(--amber-glow)',
            flexShrink: 0
          }}>
            <HardHat size={26} color="#FFFFFF" strokeWidth={2.4} />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              PunchList <span style={{ color: 'var(--amber)' }}>PRO</span>
            </div>
            <div style={{ fontSize: 11, color: '#A1A1AA', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600 }}>
              Construction Management Software
            </div>
          </div>
        </div>

        {/* Central Headline - Vertically Centered in Left Bar */}
        <div className="login-hero-content" style={{ position: 'relative', zIndex: 10, maxWidth: 600, margin: 'auto 0' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            borderRadius: 20,
            backgroundColor: 'rgba(217, 119, 6, 0.15)',
            border: '1px solid rgba(217, 119, 6, 0.3)',
            color: '#FCD34D',
            fontSize: 12,
            fontWeight: 700,
            marginBottom: 20,
            textTransform: 'uppercase',
            letterSpacing: '0.06em'
          }}>
            <Sparkles size={14} />
            Group 6 Project - Punch List
          </div>

          <h1 className="login-hero-headline">
            Smarter <span style={{ color: 'var(--amber)' }}>Punch</span>, <br />
            Stronger <span style={{ color: 'var(--amber)' }}>Buildings</span>.
          </h1>

          <p className="login-hero-desc">
            Capture, track, and resolve construction punch items with photos, locations, and real-time collaboration - all in one place.
          </p>
        </div>

        {/* Bottom balancing element */}
        <div className="login-hero-spacer" style={{ height: 44, opacity: 0, pointerEvents: 'none' }} aria-hidden="true" />
      </div>

      {/* -------------------------------------------------------------
          RIGHT HALF: Warm Off-White (#F8F7F4) with Centered Sign-in Card
          ------------------------------------------------------------- */}
      <main id="main-content" role="main" aria-label="Sign In" className="login-main-panel">
        <div className="login-card">
          <div style={{ marginBottom: 14 }}>
            <h2 className="login-card-title">
              Welcome!
            </h2>
            <h3 className="login-card-subtitle">
              <span>Log In</span>{' '}
              <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>or</span>{' '}
              <a
                href="https://accounts.umbc.edu/"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'var(--amber, #D97706)',
                  textDecoration: 'underline',
                  fontWeight: 700
                }}
              >
                Create an Account
              </a>
            </h3>
          </div>

          {/* Demo Accounts Quick-Select */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            marginBottom: 14,
            padding: '8px 10px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--surface-muted)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
              Demo accounts — Password: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>Demo@2026!</span>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 6
            }}>
            {demoAccounts.map((acc) => (
              <button
                key={acc.roleKey}
                type="button"
                aria-pressed={selectedDemoRole === acc.roleKey}
                aria-label={`Select demo account: ${acc.name}`}
                onClick={() => handleDemoSelect(acc)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: selectedDemoRole === acc.roleKey ? '1.5px solid var(--amber)' : '1px solid var(--border)',
                  backgroundColor: selectedDemoRole === acc.roleKey ? '#FFFFFF' : 'transparent',
                  color: selectedDemoRole === acc.roleKey ? 'var(--ink)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 120ms ease',
                  width: '100%',
                  minHeight: 36
                }}
              >
                {/* Role badge */}
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 42,
                  height: 20,
                  padding: '0 6px',
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  backgroundColor: acc.bg,
                  color: acc.color,
                  flexShrink: 0,
                }}>
                  {acc.badge}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>{acc.name}</div>

                </div>
                {selectedDemoRole === acc.roleKey && (
                  <CheckCircle2 size={16} color="var(--amber)" style={{ flexShrink: 0 }} />
                )}
              </button>
            ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label
                htmlFor="login-email"
                style={{ display: 'block', textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 5 }}
              >
                Username / Email
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-email"
                  type="text"
                  autoComplete="username"
                  className="input-field"
                  value={email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  style={{ textAlign: 'left', paddingLeft: 14, height: 40 }}
                  placeholder="Enter your username or email"
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                style={{ display: 'block', textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 5 }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 12 }} aria-hidden="true" />
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  className="input-field"
                  value={password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  style={{ paddingLeft: 38, height: 40 }}
                  placeholder="Enter your password"
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 5 }}>
                <a
                  href="#forgot"
                  onClick={(e) => { e.preventDefault(); alert('Demo password reset link simulated.'); }}
                  style={{ fontSize: 12, color: 'var(--amber)', textDecoration: 'none', fontWeight: 600 }}
                >
                  Forgot password?
                </a>
              </div>
            </div>

            {/* Inline auth error banner */}
            {authError && (
              <div
                role="alert"
                aria-live="assertive"
                style={{
                  padding: '9px 12px',
                  backgroundColor: '#FEE2E2',
                  border: '1.5px solid #FCA5A5',
                  borderRadius: 8,
                  color: '#7F1D1D',
                  fontSize: 13,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <span style={{ fontSize: 16 }} aria-hidden="true">⚠</span>
                {authError}
              </div>
            )}

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: '100%',
                height: 42,
                fontSize: 15,
                marginTop: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
            >
              {loading ? (
                <>
                  <span className="spin-icon" style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid #FFFFFF', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <span>Connecting to Field Ops…</span>
                </>
              ) : (
                <>
                  <span>Log In</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* OAuth: Google */}
          <div style={{ marginTop: 14 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 10
            }}>
              <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border)' }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Or continue with
              </span>
              <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border)' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                type="button"
                id="btn-google-oauth"
                aria-label="Continue with Google"
                disabled={!!oauthLoading}
                onClick={() => handleOAuth('google')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  width: '100%',
                  height: 40,
                  borderRadius: 8,
                  border: '1.5px solid var(--border)',
                  backgroundColor: oauthLoading === 'google' ? '#F9F9F9' : '#FFFFFF',
                  cursor: oauthLoading ? 'not-allowed' : 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--ink)',
                  transition: 'all 120ms ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                }}
              >
                {oauthLoading === 'google' ? (
                  <span style={{ width: 16, height: 16, border: '2px solid #CBD5E0', borderTopColor: '#4285F4', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                )}
                Continue with Google
              </button>
            </div>
          </div>

          {/* SOC 2 / Security Trust Line */}
          <div style={{
            marginTop: 14,
            paddingTop: 10,
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            fontSize: 11,
            color: 'var(--text-muted)'
          }}>
            <ShieldCheck size={22} color="#16A34A" style={{ flexShrink: 0 }} />
            <span style={{ lineHeight: 1.3 }}>
              When you are finished...
              <br />
              <strong>LOG OUT &amp; CLOSE YOUR BROWSER</strong>
            </span>
          </div>

          {/* UMBC Policy & Compliance Notice */}
          <div style={{
            marginTop: 10,
            textAlign: 'center',
            fontSize: 11,
            lineHeight: 1.45,
            color: 'var(--text-muted)'
          }}>
            <p style={{ margin: 0 }}>
              <strong>Important:</strong> Usage of UMBC computing resources is governed by the{' '}
              <a
                href="https://my.umbc.edu/go/responsible-computing"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'var(--amber, #D97706)',
                  textDecoration: 'underline',
                  fontWeight: 600
                }}
              >
                UMBC Policy for Responsible Computing
              </a>{' '}
              and this{' '}
              <a
                href="https://webauth.umbc.edu/motd.html"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'var(--amber, #D97706)',
                  textDecoration: 'underline',
                  fontWeight: 600
                }}
              >
                notice
              </a>.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
