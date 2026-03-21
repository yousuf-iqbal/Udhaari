// src/pages/AuthPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import API from '../api/axios';

const VIEWS = { LOGIN: 'login', SIGNUP: 'signup', FORGOT: 'forgot', VERIFY: 'verify' };

// password strength — returns 0-4
const getStrength = (pw) => {
  let s = 0;
  if (pw.length >= 8)        s++;
  if (/[A-Z]/.test(pw))      s++;
  if (/[0-9]/.test(pw))      s++;
  if (/[^a-zA-Z0-9]/.test(pw)) s++;
  return s;
};

const strengthConfig = {
  0: { color: '#ef4444', label: 'Too short',  width: '0%'   },
  1: { color: '#ef4444', label: 'Weak',       width: '25%'  },
  2: { color: '#f59e0b', label: 'Fair',       width: '50%'  },
  3: { color: '#22c55e', label: 'Good',       width: '75%'  },
  4: { color: '#22c55e', label: 'Strong',     width: '100%' },
};

export default function AuthPage() {
  const navigate        = useNavigate();
  const [view, setView] = useState(VIEWS.LOGIN);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [showPw, setShowPw]   = useState(false);

  // login
  const [liEmail, setLiEmail] = useState('');
  const [liPass,  setLiPass]  = useState('');

  // signup step 1
  const [suEmail,   setSuEmail]   = useState('');
  const [suPass,    setSuPass]    = useState('');
  const [suConfirm, setSuConfirm] = useState('');

  // signup step 2
  const [fullName,   setFullName]   = useState('');
  const [phone,      setPhone]      = useState('');
  const [city,       setCity]       = useState('');
  const [area,       setArea]       = useState('');
  const [cnic,       setCnic]       = useState('');
  const [profilePic, setProfilePic] = useState(null);
  const [cnicPic,    setCnicPic]    = useState(null);

  const clear = () => { setError(''); setSuccess(''); };
  const go    = (v) => { setView(v); setStep(1); clear(); setShowPw(false); };

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault(); clear();
    if (!liEmail || !liPass) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, liEmail, liPass);

      // retry reload up to 3 times — fixes stale emailVerified after clicking link
      let verified = false;
      for (let i = 0; i < 3; i++) {
        await cred.user.reload();
        if (auth.currentUser?.emailVerified) { verified = true; break; }
        await new Promise(r => setTimeout(r, 800));
      }

      if (!verified) {
        setError('Please verify your email first. Check your inbox.');
        setLoading(false);
        return;
      }

      // CRITICAL: force fresh token AFTER reload so axios sends verified token
      // without this the old cached token is used and backend returns 404
      await auth.currentUser.getIdToken(true);

      try {
        const res = await API.post('/auth/login');
        localStorage.setItem('udhaari_user', JSON.stringify(res.data.user));
        navigate('/');
      } catch (err) {
        if (err.response?.status === 404) {
          // profile not in DB — check if pending data exists from signup
          const pending = localStorage.getItem('udhaari_pending_profile');
          if (pending) {
            try {
              const data = JSON.parse(pending);
              const form = new FormData();
              Object.entries(data).forEach(([k, v]) => { if (v) form.append(k, v); });
              await API.post('/auth/register', form);
              localStorage.removeItem('udhaari_pending_profile');
              localStorage.removeItem('udhaari_pending_email');
              const res2 = await API.post('/auth/login');
              localStorage.setItem('udhaari_user', JSON.stringify(res2.data.user));
              navigate('/');
            } catch {
              setError('Could not save profile. Please try again.');
            }
          } else {
            // no pending data — go to profile completion
            go(VIEWS.SIGNUP);
            setStep(2);
          }
        } else {
          setError(err.response?.data?.error || 'Login failed.');
        }
      }
    } catch (err) {
      if (err.code === 'auth/invalid-credential')     setError('Wrong email or password.');
      else if (err.code === 'auth/too-many-requests') setError('Too many attempts. Try again later.');
      else setError('Something went wrong. Is the server running?');
    }
    setLoading(false);
  };

  // ── FORGOT ────────────────────────────────────────────────────────────────
  const handleForgot = async (e) => {
    e.preventDefault(); clear();
    if (!liEmail) { setError('Enter your email address.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(liEmail)) { setError('Enter a valid email.'); return; }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, liEmail);
      setSuccess('Reset link sent. Check your inbox.');
    } catch {
      setSuccess('If that email exists, a reset link has been sent.');
    }
    setLoading(false);
  };

  // ── SIGNUP STEP 1 ──────────────────────────────────────────────────────────
  const handleStep1 = async (e) => {
    e.preventDefault(); clear();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(suEmail)) { setError('Enter a valid email address.'); return; }
    if (suPass.length < 8)     { setError('Password must be at least 8 characters.'); return; }
    if (/\s/.test(suPass))     { setError('Password cannot contain spaces.'); return; }
    if (suPass !== suConfirm)  { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, suEmail, suPass);
      setStep(2);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') setError('Email already registered. Please log in.');
      else if (err.code === 'auth/invalid-email')   setError('Invalid email format.');
      else setError(err.message);
    }
    setLoading(false);
  };

  // ── SIGNUP STEP 2 ──────────────────────────────────────────────────────────
  const handleStep2 = async (e) => {
    e.preventDefault(); clear();
    if (!fullName.trim())                 { setError('Full name is required.'); return; }
    if (!/^[a-zA-Z\s]+$/.test(fullName)) { setError('Name can only contain letters.'); return; }
    if (!/^03\d{9}$/.test(phone))         { setError('Phone must be 11 digits starting with 03.'); return; }
    if (!city.trim())                      { setError('City is required.'); return; }
    if (!/^\d{13}$/.test(cnic))           { setError('CNIC must be exactly 13 digits.'); return; }
    setLoading(true);
    try {
      localStorage.setItem('udhaari_pending_profile', JSON.stringify({
        fullName: fullName.trim(), phone, city: city.trim(), area, cnic,
      }));
      await sendEmailVerification(auth.currentUser);
      localStorage.setItem('udhaari_pending_email', suEmail);
      go(VIEWS.VERIFY);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  const pendingEmail = localStorage.getItem('udhaari_pending_email') || suEmail;
  const strength     = suPass.length > 0 ? getStrength(suPass) : -1;
  const sConfig      = strengthConfig[Math.max(0, strength)];

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '1.5rem', background: '#080810',
      fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif",
      position: 'relative', overflow: 'hidden',
    }}>

      {/* blobs */}
      <div style={{
        position: 'fixed', top: '-20%', left: '-10%',
        width: '50vw', height: '50vw', borderRadius: '50%',
        background: 'radial-gradient(circle, #6d28d930 0%, transparent 70%)',
        pointerEvents: 'none', filter: 'blur(40px)',
      }} />
      <div style={{
        position: 'fixed', bottom: '-20%', right: '-10%',
        width: '40vw', height: '40vw', borderRadius: '50%',
        background: 'radial-gradient(circle, #4f46e520 0%, transparent 70%)',
        pointerEvents: 'none', filter: 'blur(40px)',
      }} />

      {/* card */}
      <div style={{
        width: '100%',
        maxWidth: view === VIEWS.SIGNUP && step === 2 ? '480px' : '400px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '28px', padding: '2.5rem',
        backdropFilter: 'blur(20px)',
        position: 'relative', zIndex: 1,
        transition: 'max-width 0.3s ease',
      }}>

        {/* dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '2rem' }}>
          {[VIEWS.LOGIN, VIEWS.SIGNUP, VIEWS.FORGOT].map(v => (
            <div key={v} onClick={() => v !== VIEWS.FORGOT && go(v)}
              style={{
                width: view === v ? '24px' : '6px', height: '6px',
                borderRadius: '99px',
                background: view === v ? '#8b5cf6' : 'rgba(255,255,255,0.12)',
                cursor: v !== VIEWS.FORGOT ? 'pointer' : 'default',
                transition: 'all 0.3s ease',
              }} />
          ))}
        </div>

        {/* heading */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '1.6rem', fontWeight: 800, color: '#fff',
            letterSpacing: '-0.03em', marginBottom: '0.4rem', lineHeight: 1.2,
          }}>
            {view === VIEWS.LOGIN  && 'Welcome back'}
            {view === VIEWS.SIGNUP && step === 1 && 'Create account'}
            {view === VIEWS.SIGNUP && step === 2 && 'Your details'}
            {view === VIEWS.FORGOT && 'Reset password'}
            {view === VIEWS.VERIFY && 'Check your email'}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem' }}>
            {view === VIEWS.LOGIN  && 'Sign in to continue to Udhaari'}
            {view === VIEWS.SIGNUP && step === 1 && 'Enter your email and a strong password'}
            {view === VIEWS.SIGNUP && step === 2 && 'Tell us a bit about yourself'}
            {view === VIEWS.FORGOT && "We'll send you a reset link"}
            {view === VIEWS.VERIFY && `Sent to ${pendingEmail}`}
          </p>
        </div>

        {/* step bar */}
        {view === VIEWS.SIGNUP && (
          <div style={{ display: 'flex', gap: '6px', marginBottom: '1.5rem' }}>
            {[1, 2].map(s => (
              <div key={s} style={{
                flex: 1, height: '3px', borderRadius: '99px',
                background: step >= s ? '#8b5cf6' : 'rgba(255,255,255,0.08)',
                transition: 'background 0.3s',
              }} />
            ))}
          </div>
        )}

        {/* alerts */}
        {error && (
          <div style={{
            padding: '0.7rem 1rem', borderRadius: '12px', marginBottom: '1.25rem',
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            color: '#fca5a5', fontSize: '0.82rem', lineHeight: 1.5,
          }}>{error}</div>
        )}
        {success && (
          <div style={{
            padding: '0.7rem 1rem', borderRadius: '12px', marginBottom: '1.25rem',
            background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
            color: '#86efac', fontSize: '0.82rem', lineHeight: 1.5,
          }}>{success}</div>
        )}

        {/* ── LOGIN ── */}
        {view === VIEWS.LOGIN && (
          <form onSubmit={handleLogin}>
            <F label="Email address" type="email" value={liEmail}
              onChange={e => setLiEmail(e.target.value)} placeholder="you@example.com" required />
            <div style={{ position: 'relative' }}>
              <F label="Password" type={showPw ? 'text' : 'password'}
                value={liPass} onChange={e => setLiPass(e.target.value)}
                placeholder="your password" required />
              <button type="button" onClick={() => setShowPw(!showPw)} style={{
                position: 'absolute', right: '12px', bottom: '26px',
                background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)',
                cursor: 'pointer', fontSize: '0.9rem', padding: 0,
              }}>{showPw ? '🙈' : '👁'}</button>
            </div>
            <div style={{ textAlign: 'right', marginTop: '-0.5rem', marginBottom: '1.25rem' }}>
              <button type="button" onClick={() => go(VIEWS.FORGOT)} style={{
                background: 'none', border: 'none', color: '#8b5cf6',
                fontSize: '0.78rem', cursor: 'pointer', padding: 0,
              }}>Forgot password?</button>
            </div>
            <Btn loading={loading}>Sign In</Btn>
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '0.8rem', marginTop: '1.25rem' }}>
              No account?{' '}
              <button type="button" onClick={() => go(VIEWS.SIGNUP)} style={{
                background: 'none', border: 'none', color: '#a78bfa',
                cursor: 'pointer', fontSize: 'inherit', fontWeight: 600,
              }}>Create one</button>
            </p>
          </form>
        )}

        {/* ── FORGOT ── */}
        {view === VIEWS.FORGOT && (
          <form onSubmit={handleForgot}>
            <F label="Email address" type="email" value={liEmail}
              onChange={e => setLiEmail(e.target.value)} placeholder="you@example.com" required />
            <Btn loading={loading}>Send Reset Link</Btn>
            <BackBtn onClick={() => go(VIEWS.LOGIN)} label="Back to login" />
          </form>
        )}

        {/* ── SIGNUP STEP 1 ── */}
        {view === VIEWS.SIGNUP && step === 1 && (
          <form onSubmit={handleStep1}>
            <F label="Email address" type="email" value={suEmail}
              onChange={e => setSuEmail(e.target.value)} placeholder="you@example.com" required />

            {/* password with strength bar */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block', fontSize: '0.72rem', fontWeight: 600,
                color: 'rgba(255,255,255,0.35)', marginBottom: '6px',
                letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={suPass} onChange={e => setSuPass(e.target.value)}
                  placeholder="min 8 characters" required
                  style={{
                    width: '100%', padding: '0.75rem 1rem',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px', color: '#fff', fontSize: '0.9rem',
                    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(139,92,246,0.5)'}
                  onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)',
                  cursor: 'pointer', fontSize: '0.9rem', padding: 0,
                }}>{showPw ? '🙈' : '👁'}</button>
              </div>

              {/* strength bar */}
              {suPass.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{
                    height: '3px', borderRadius: '99px',
                    background: 'rgba(255,255,255,0.06)',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: sConfig.width,
                      background: sConfig.color,
                      borderRadius: '99px',
                      transition: 'width 0.3s ease, background 0.3s ease',
                    }} />
                  </div>
                  <p style={{
                    fontSize: '0.7rem', marginTop: '4px',
                    color: sConfig.color, textAlign: 'right',
                    transition: 'color 0.3s',
                  }}>
                    {sConfig.label}
                  </p>
                </div>
              )}
            </div>

            <F label="Confirm password" type="password" value={suConfirm}
              onChange={e => setSuConfirm(e.target.value)} placeholder="repeat password" required />
            <Btn loading={loading}>Continue →</Btn>
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '0.8rem', marginTop: '1.25rem' }}>
              Already registered?{' '}
              <button type="button" onClick={() => go(VIEWS.LOGIN)} style={{
                background: 'none', border: 'none', color: '#a78bfa',
                cursor: 'pointer', fontSize: 'inherit', fontWeight: 600,
              }}>Sign in</button>
            </p>
          </form>
        )}

        {/* ── SIGNUP STEP 2 ── */}
        {view === VIEWS.SIGNUP && step === 2 && (
          <form onSubmit={handleStep2}>
            <F label="Full name" value={fullName}
              onChange={e => setFullName(e.target.value)} placeholder="Yousuf Ahmed" required />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <F label="City" value={city}
                onChange={e => setCity(e.target.value)} placeholder="Lahore" required />
              <F label="Area (optional)" value={area}
                onChange={e => setArea(e.target.value)} placeholder="DHA Phase 5" />
            </div>
            <div>
              <F label="Phone number" value={phone}
                onChange={e => setPhone(e.target.value)} placeholder="03001234567" required />
              {phone && !/^03\d{9}$/.test(phone) && (
                <p style={{ color: '#fca5a5', fontSize: '0.72rem', marginTop: '-0.75rem', marginBottom: '1rem' }}>
                  Must be 11 digits starting with 03
                </p>
              )}
            </div>
            <div>
              <F label="CNIC number" value={cnic}
                onChange={e => setCnic(e.target.value)} placeholder="3520112345671" required />
              {cnic && !/^\d{13}$/.test(cnic) && (
                <p style={{ color: '#fca5a5', fontSize: '0.72rem', marginTop: '-0.75rem', marginBottom: '1rem' }}>
                  Must be exactly 13 digits
                </p>
              )}
            </div>
            <FileF label="Profile picture (optional)"
              onChange={e => setProfilePic(e.target.files[0])} accept="image/*" />
            <FileF label="CNIC picture (optional)"
              onChange={e => setCnicPic(e.target.files[0])} accept="image/*,.pdf" />
            <Btn loading={loading}>Save & Verify Email →</Btn>
            <BackBtn onClick={() => setStep(1)} label="Back" />
          </form>
        )}

        {/* ── VERIFY EMAIL ── */}
        {view === VIEWS.VERIFY && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📬</div>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', lineHeight: 1.7, marginBottom: '2rem' }}>
              We sent a verification link to<br />
              <strong style={{ color: '#a78bfa' }}>{pendingEmail}</strong>.<br /><br />
              Click the link in your email to activate your account.
              Your profile will be saved automatically when you log in.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Btn loading={false} onClick={() => go(VIEWS.LOGIN)}>Go to Login</Btn>
              <BackBtn onClick={() => { go(VIEWS.SIGNUP); setStep(2); }} label="Edit profile info" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── shared components ─────────────────────────────────────────────────────────

function F({ label, type = 'text', value, onChange, placeholder, required }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{
        display: 'block', fontSize: '0.72rem', fontWeight: 600,
        color: 'rgba(255,255,255,0.35)', marginBottom: '6px',
        letterSpacing: '0.08em', textTransform: 'uppercase',
      }}>{label}</label>
      <input type={type} value={value} onChange={onChange}
        placeholder={placeholder} required={required}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          width: '100%', padding: '0.75rem 1rem',
          background: focused ? 'rgba(139,92,246,0.06)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${focused ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: '12px', color: '#fff', fontSize: '0.9rem', outline: 'none',
          boxSizing: 'border-box', transition: 'all 0.2s', fontFamily: 'inherit',
        }}
      />
    </div>
  );
}

function FileF({ label, onChange, accept }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{
        display: 'block', fontSize: '0.72rem', fontWeight: 600,
        color: 'rgba(255,255,255,0.35)', marginBottom: '6px',
        letterSpacing: '0.08em', textTransform: 'uppercase',
      }}>{label}</label>
      <input type="file" accept={accept} onChange={onChange} style={{
        width: '100%', padding: '0.6rem 1rem',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px', color: 'rgba(255,255,255,0.4)',
        fontSize: '0.82rem', cursor: 'pointer', boxSizing: 'border-box',
      }} />
    </div>
  );
}

function Btn({ loading, children, onClick }) {
  return (
    <button type={onClick ? 'button' : 'submit'} onClick={onClick} disabled={loading}
      style={{
        width: '100%', padding: '0.85rem',
        background: loading ? '#6d28d9' : 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
        border: 'none', borderRadius: '14px', color: '#fff',
        fontSize: '0.9rem', fontWeight: 700,
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1, letterSpacing: '0.02em',
        boxShadow: loading ? 'none' : '0 4px 20px rgba(109,40,217,0.35)',
        transition: 'all 0.2s', fontFamily: 'inherit',
      }}>
      {loading ? 'Please wait...' : children}
    </button>
  );
}

function BackBtn({ onClick, label }) {
  return (
    <button type="button" onClick={onClick}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
      style={{
        width: '100%', padding: '0.75rem', background: 'transparent',
        border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px',
        color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', cursor: 'pointer',
        marginTop: '10px', fontFamily: 'inherit', transition: 'all 0.2s',
      }}>
      ← {label}
    </button>
  );
}