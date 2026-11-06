import React, { useState, useEffect } from 'react';
import {
  HardHat,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Building2,
  Briefcase
} from 'lucide-react';
import { api } from '../services/api';
import './OnboardingPage.css';

export default function OnboardingPage({ token, onComplete, onBackToLogin }) {
  const [loading, setLoading] = useState(true);
  const [verifyingError, setVerifyingError] = useState(null);
  const [inviteData, setInviteData] = useState(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);

  // Validate token on mount
  useEffect(() => {
    async function checkToken() {
      if (!token) {
        setVerifyingError({
          title: 'Missing Invitation Token',
          message: 'No invitation credential was found in this link. Please check your invitation email or contact your administrator.'
        });
        setLoading(false);
        return;
      }

      try {
        const data = await api.verifyInvitation(token);
        setInviteData(data);
      } catch (err) {
        setVerifyingError({
          title: 'Invitation Unavailable',
          message: err.message || 'This invitation link is invalid or has expired.'
        });
      } finally {
        setLoading(false);
      }
    }

    checkToken();
  }, [token]);

  // Validation rules
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isFormValid = hasMinLength && hasUpper && hasLower && hasNumber && passwordsMatch;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid || submitting) return;

    setSubmitting(true);
    setSubmitError('');

    try {
      const res = await api.completeOnboarding({ token, password });
      setSuccess(true);
      setTimeout(() => {
        if (onComplete) {
          onComplete(res.user);
        }
      }, 1200);
    } catch (err) {
      setSubmitError(err.message || 'Failed to complete onboarding. Please try again.');
      setSubmitting(false);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin': return 'Facility Administrator';
      case 'general_contractor': return 'General Contractor';
      case 'sub_contractor': return 'Trade Subcontractor';
      case 'architect': return 'Architect / Engineer';
      case 'owner': return 'Owner Representative';
      case 'field_inspector': return 'Field Inspector';
      default: return (role || 'Team Member').replace('_', ' ').toUpperCase();
    }
  };

  return (
    <div className="onboard-container">
      <div className="onboard-grid" />
      <div className="onboard-glow" />

      <div className="onboard-card">
        {/* Brand Header */}
        <div className="onboard-header">
          <div className="onboard-brand-icon">
            <HardHat size={26} color="#FFFFFF" strokeWidth={2.4} />
          </div>
          <div>
            <div className="onboard-brand-title">
              PunchList <span style={{ color: '#D97706' }}>PRO</span>
            </div>
            <div className="onboard-brand-sub">First-Login Account Setup</div>
          </div>
        </div>

        <div className="onboard-body">
          {/* Loading State */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#71717A' }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                border: '3px solid #D97706',
                borderTopColor: 'transparent',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 16px'
              }} />
              <div style={{ fontSize: 14, fontWeight: 600 }}>Verifying your invitation credentials…</div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* Error / Expired / Suspended Banner */}
          {!loading && verifyingError && (
            <div>
              <div className="onboard-error-alert">
                <AlertTriangle size={22} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div className="onboard-alert-title">{verifyingError.title}</div>
                  <div className="onboard-alert-msg">{verifyingError.message}</div>
                </div>
              </div>
              <button
                type="button"
                className="onboard-back-link"
                onClick={onBackToLogin}
              >
                ← Return to Sign In
              </button>
            </div>
          )}

          {/* Success State */}
          {!loading && success && (
            <div style={{ textAlign: 'center', padding: '30px 10px' }}>
              <CheckCircle2 size={52} color="#16A34A" style={{ margin: '0 auto 16px' }} />
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#18181B', marginBottom: 8 }}>
                Password Established!
              </h2>
              <p style={{ fontSize: 13, color: '#52525B', margin: 0 }}>
                Your account is now activated. Entering PunchList Pro…
              </p>
            </div>
          )}

          {/* Valid Invitation Form */}
          {!loading && !verifyingError && !success && inviteData && (
            <div>
              {/* Profile card summary */}
              <div className="onboard-user-badge">
                <div className="onboard-user-avatar">
                  {inviteData.name ? inviteData.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="onboard-user-name">{inviteData.name}</div>
                  <div className="onboard-user-meta">{inviteData.email}</div>
                  <div className="onboard-role-pill">
                    {getRoleBadge(inviteData.role)}
                    {inviteData.trade ? ` · ${inviteData.trade}` : ''}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#18181B', margin: '0 0 6px' }}>
                  Create Your Password
                </h3>
                <p style={{ fontSize: 13, color: '#52525B', margin: 0, lineHeight: 1.4 }}>
                  Welcome to the team! Set a secure permanent password to activate your account and access your blueprints.
                </p>
              </div>

              {submitError && (
                <div className="onboard-error-alert">
                  <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                  <div className="onboard-alert-msg">{submitError}</div>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="onboard-form-group">
                  <label className="onboard-label">New Password</label>
                  <div className="onboard-input-wrap">
                    <Lock size={16} className="onboard-input-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="onboard-input"
                      placeholder="Enter a secure password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="onboard-eye-btn"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="onboard-form-group">
                  <label className="onboard-label">Confirm Password</label>
                  <div className="onboard-input-wrap">
                    <Lock size={16} className="onboard-input-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="onboard-input"
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Password strength checklist */}
                <div className="onboard-requirements">
                  <div className="onboard-req-title">Password Requirements</div>
                  <div className={`onboard-req-item ${hasMinLength ? 'met' : ''}`}>
                    {hasMinLength ? <CheckCircle2 size={14} /> : <XCircle size={14} color="#A1A1AA" />}
                    <span>At least 8 characters</span>
                  </div>
                  <div className={`onboard-req-item ${hasUpper ? 'met' : ''}`}>
                    {hasUpper ? <CheckCircle2 size={14} /> : <XCircle size={14} color="#A1A1AA" />}
                    <span>At least one uppercase letter (A-Z)</span>
                  </div>
                  <div className={`onboard-req-item ${hasLower ? 'met' : ''}`}>
                    {hasLower ? <CheckCircle2 size={14} /> : <XCircle size={14} color="#A1A1AA" />}
                    <span>At least one lowercase letter (a-z)</span>
                  </div>
                  <div className={`onboard-req-item ${hasNumber ? 'met' : ''}`}>
                    {hasNumber ? <CheckCircle2 size={14} /> : <XCircle size={14} color="#A1A1AA" />}
                    <span>At least one number (0-9)</span>
                  </div>
                  <div className={`onboard-req-item ${passwordsMatch ? 'met' : ''}`}>
                    {passwordsMatch ? <CheckCircle2 size={14} /> : <XCircle size={14} color="#A1A1AA" />}
                    <span>Passwords match</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="onboard-submit-btn"
                  disabled={!isFormValid || submitting}
                >
                  {submitting ? 'Activating Account…' : 'Activate Account & Access Projects'}
                  <ArrowRight size={16} />
                </button>
              </form>

              <button
                type="button"
                className="onboard-back-link"
                onClick={onBackToLogin}
              >
                ← Back to standard sign in
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

