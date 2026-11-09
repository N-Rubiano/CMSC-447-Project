import React, { useState, useEffect } from 'react';
import {
  HardHat,
  Lock,
  Mail,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Info,
  AlertCircle
} from 'lucide-react';
import './LoginPage.css';

// api is imported lazily inside handleSubmit so it doesn't block first paint
export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [savePassword, setSavePassword] = useState(() => {
    try {
      return localStorage.getItem('punchlist_save_creds') === 'true';
    } catch {
      return false;
    }
  });
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Prepopulate saved credentials if user previously checked "Save password"
  useEffect(() => {
    try {
      if (localStorage.getItem('punchlist_save_creds') === 'true') {
        const saved = localStorage.getItem('punchlist_saved_creds');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.email) setEmail(parsed.email);
          if (parsed.password) setPassword(parsed.password);
        }
      }
    } catch (_) {}
  }, []);

  const handleInputChange = (field, val) => {
    if (field === 'email') setEmail(val);
    if (field === 'password') setPassword(val);
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
      // Lazy-import api so supabase + socket.io aren't on critical path
      const { api } = await import('../services/api');
      const { user } = await api.login(email.trim(), password);

      // Handle Save Password preference
      try {
        if (savePassword) {
          localStorage.setItem('punchlist_save_creds', 'true');
          localStorage.setItem('punchlist_saved_creds', JSON.stringify({
            email: email.trim(),
            password: password
          }));
        } else {
          localStorage.removeItem('punchlist_save_creds');
          localStorage.removeItem('punchlist_saved_creds');
        }
      } catch (_) {}

      onLogin({ email: email.trim(), role: user.role || 'admin', ...user });
    } catch (err) {
      setAuthError(err.message || 'Sign in failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      {/* ── Left Hero Panel (Architectural Amber & Ink) ── */}
      <div className="login-hero-panel">
        <div className="login-hero-grid" aria-hidden="true" />
        <div className="login-hero-glow" aria-hidden="true" />

        {/* Brand Header */}
        <div className="login-brand-header">
          <div className="login-brand-icon">
            <HardHat size={26} color="#FFFFFF" strokeWidth={2.4} />
          </div>
          <div>
            <div className="login-brand-title">
              PunchList <span className="login-brand-highlight">PRO</span>
            </div>
            <div className="login-brand-badge">
              Construction Management Software
            </div>
          </div>
        </div>

        {/* Central Headline & Mission Statement */}
        <div className="login-hero-content">
          <div className="login-hero-pill">
            <Sparkles size={13} />
            Enterprise Field Operations
          </div>

          <h1 className="login-hero-headline">
            Smarter <span className="login-brand-highlight">Punch</span>, <br />
            Stronger <span className="login-brand-highlight">Buildings</span>.
          </h1>

          <p className="login-hero-desc">
            Capture, track, and resolve architectural punch items with blueprint pins,
            field photos, and real-time trade coordination in one unified system.
          </p>
        </div>

        <div className="login-hero-spacer" aria-hidden="true" />
      </div>

      {/* ── Right Sign-in Panel ── */}
      <main id="main-content" role="main" aria-label="Sign In" className="login-main-panel">
        <div className="login-card">
          <div className="login-card-header">
            <h2 className="login-card-title">
              Welcome!
            </h2>
            <p className="login-card-subtitle">
              Sign in with your authorized facility credentials
            </p>
          </div>

          {/* Sign In Form */}
          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field-group">
              <label htmlFor="login-email" className="login-label">
                Username / Email
              </label>
              <div className="login-input-wrap">
                <Mail size={16} className="login-input-icon" aria-hidden="true" />
                <input
                  id="login-email"
                  type="text"
                  autoComplete="username"
                  className="input-field login-input"
                  value={email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter your username or email"
                  required
                />
              </div>
            </div>

            <div className="login-field-group">
              <label htmlFor="login-password" className="login-label">
                Password
              </label>
              <div className="login-input-wrap">
                <Lock size={16} className="login-input-icon" aria-hidden="true" />
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  className="input-field login-input"
                  value={password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            {/* Remember Me & Assistance Row */}
            <div className="login-options-row">
              <label htmlFor="save-password-toggle" className="login-remember-label">
                <input
                  id="save-password-toggle"
                  type="checkbox"
                  checked={savePassword}
                  onChange={(e) => setSavePassword(e.target.checked)}
                  className="login-remember-checkbox"
                />
                <span>Save password</span>
              </label>

              <a
                href="#forgot"
                onClick={(e) => {
                  e.preventDefault();
                  alert('Password assistance: Accounts are provisioned by project administrators. If you forgot your password or need an activation link, please contact your facility admin or superintendent.');
                }}
                className="login-forgot-link"
              >
                Forgot password?
              </a>
            </div>

            {/* Inline Auth Error Banner */}
            {authError && (
              <div role="alert" aria-live="assertive" className="login-error-banner">
                <AlertCircle size={15} className="login-error-icon" aria-hidden="true" />
                <span>{authError}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary login-submit-btn"
            >
              {loading ? (
                <>
                  <span className="spin-icon" aria-hidden="true" />
                  <span>Connecting to Field Ops…</span>
                </>
              ) : (
                <>
                  <span>Log In</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          {/* Administrator Managed Notice */}
          <div className="login-managed-notice">
            <Info size={14} className="login-managed-icon" aria-hidden="true" />
            <span>
              Personnel accounts are provisioned exclusively by project administrators.
              Need access? Request an invite from your superintendent.
            </span>
          </div>

          {/* SOC 2 / Security Notice */}
          <div className="login-trust-line">
            <ShieldCheck size={20} color="#16A34A" style={{ flexShrink: 0 }} aria-hidden="true" />
            <span>
              When finished with field operations, please <strong>log out</strong> and close your session.
            </span>
          </div>

          {/* UMBC Policy & Compliance Notice */}
          <div className="login-compliance-footer">
            <p>
              <strong>Important:</strong> Usage of UMBC computing resources is governed by the{' '}
              <a
                href="https://my.umbc.edu/go/responsible-computing"
                target="_blank"
                rel="noopener noreferrer"
              >
                UMBC Policy for Responsible Computing
              </a>{' '}
              and compliance requirements.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
