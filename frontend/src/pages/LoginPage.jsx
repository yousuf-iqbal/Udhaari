// src/pages/LoginPage.jsx
import { useState } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../config/firebase';
import API from '../api/axios';

export default function LoginPage() {
  const navigate = useNavigate();

  const [mode, setMode]       = useState('login');  // 'login' or 'forgot'
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);

      // check email is verified
      if (!cred.user.emailVerified) {
        setError('Please verify your email first. Check your inbox for the verification link.');
        setLoading(false);
        return;
      }

      // get profile from backend
      const res = await API.post('/auth/login');

      if (res.data.user) {
        // save user to localStorage for quick access
        localStorage.setItem('udhaari_user', JSON.stringify(res.data.user));
        navigate('/');  // redirect to home/dashboard
      }

    } catch (err) {
      if (err.code === 'auth/invalid-credential') {
        setError('Wrong email or password.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Try again later.');
      } else if (err.code === 'auth/user-not-found') {
        setError('No account found with this email.');
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Something went wrong. Is your server running?');
      }
    }

    setLoading(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(`Password reset link sent to ${email}. Check your inbox.`);
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        // don't reveal if email exists or not
        setSuccess(`If that email exists, a reset link has been sent.`);
      } else {
        setError('Something went wrong. Please try again.');
      }
    }

    setLoading(false);
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        <div style={styles.logo}>Udhaari</div>
        <div style={styles.subtitle}>
          {mode === 'login' ? 'Welcome back' : 'Reset your password'}
        </div>

        {error   && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.successBox}>{success}</div>}

        {/* ── LOGIN ── */}
        {mode === 'login' && (
          <form onSubmit={handleLogin}>
            <div style={styles.field}>
              <label style={styles.label}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={styles.input}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="your password"
                required
                style={styles.input}
              />
            </div>

            <div style={{ textAlign: 'right', marginBottom: '1rem' }}>
              <button type="button" onClick={() => { setMode('forgot'); setError(''); }}
                style={styles.forgotLink}>
                Forgot password?
              </button>
            </div>

            <button type="submit" disabled={loading} style={{
              ...styles.primaryBtn,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        )}

        {/* ── FORGOT PASSWORD ── */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword}>
            <p style={{ color: '#888', fontSize: '0.875rem', marginBottom: '1rem', lineHeight: 1.6 }}>
              Enter your email address and Firebase will send you a password reset link.
            </p>
            <div style={styles.field}>
              <label style={styles.label}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={styles.input}
              />
            </div>
            <button type="submit" disabled={loading} style={{
              ...styles.primaryBtn,
              opacity: loading ? 0.7 : 1,
            }}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
            <button type="button" onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
              style={styles.backBtn}>
              ← Back to Login
            </button>
          </form>
        )}

        <p style={styles.switchText}>
          Don't have an account?{' '}
          <Link to="/signup" style={styles.link}>Sign up</Link>
        </p>

      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0a0a0f',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    fontFamily: "'DM Sans', sans-serif",
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    background: '#13131a',
    border: '1px solid #ffffff12',
    borderRadius: '24px',
    padding: '2.5rem',
  },
  logo: {
    fontFamily: "'Syne', sans-serif",
    fontSize: '1.8rem',
    fontWeight: 800,
    color: '#7c5cfc',
    marginBottom: '0.25rem',
    letterSpacing: '-0.03em',
  },
  subtitle: {
    color: '#888',
    fontSize: '0.9rem',
    marginBottom: '1.5rem',
  },
  error: {
    background: '#ff5e7815',
    border: '1px solid #ff5e7830',
    color: '#ff5e78',
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    fontSize: '0.875rem',
    marginBottom: '1rem',
    lineHeight: 1.5,
  },
  successBox: {
    background: '#22d3a515',
    border: '1px solid #22d3a530',
    color: '#22d3a5',
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    fontSize: '0.875rem',
    marginBottom: '1rem',
    lineHeight: 1.5,
  },
  field: { marginBottom: '1rem' },
  label: {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 500,
    color: '#888',
    marginBottom: '0.4rem',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    background: '#0a0a0f',
    border: '1px solid #ffffff12',
    borderRadius: '10px',
    color: '#f0f0f5',
    fontSize: '0.95rem',
    outline: 'none',
    fontFamily: "'DM Sans', sans-serif",
    boxSizing: 'border-box',
  },
  forgotLink: {
    background: 'none',
    border: 'none',
    color: '#7c5cfc',
    fontSize: '0.82rem',
    cursor: 'pointer',
    padding: 0,
    fontFamily: "'DM Sans', sans-serif",
  },
  primaryBtn: {
    width: '100%',
    padding: '0.85rem',
    background: '#7c5cfc',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '0.95rem',
    fontWeight: 700,
    fontFamily: "'Syne', sans-serif",
    cursor: 'pointer',
    letterSpacing: '0.02em',
  },
  backBtn: {
    width: '100%',
    padding: '0.7rem',
    background: 'transparent',
    border: '1px solid #ffffff12',
    borderRadius: '10px',
    color: '#888',
    fontSize: '0.85rem',
    cursor: 'pointer',
    marginTop: '0.5rem',
    fontFamily: "'DM Sans', sans-serif",
  },
  switchText: {
    textAlign: 'center',
    color: '#666',
    fontSize: '0.85rem',
    marginTop: '1.5rem',
  },
  link: {
    color: '#7c5cfc',
    textDecoration: 'none',
    fontWeight: 500,
  },
};
