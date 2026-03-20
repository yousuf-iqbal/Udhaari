// src/pages/SignupPage.jsx
import { useState } from 'react';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../config/firebase';
import API from '../api/axios';

export default function SignupPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1 = credentials, 2 = profile, 3 = verify email
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // step 1 fields
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');

  // step 2 fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone]       = useState('');
  const [city, setCity]         = useState('');
  const [area, setArea]         = useState('');
  const [cnic, setCnic]         = useState('');
  const [profilePic, setProfilePic]   = useState(null);
  const [cnicPicture, setCnicPicture] = useState(null);

  // step 1 — create firebase account
  const handleStep1 = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      return setError('Passwords do not match.');
    }
    if (password.length < 8) {
      return setError('Password must be at least 8 characters.');
    }

    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setStep(2);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please log in.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email format.');
      } else {
        setError(err.message);
      }
    }
    setLoading(false);
  };

  // step 2 — save profile to your backend
  const handleStep2 = async (e) => {
    e.preventDefault();
    setError('');

    if (!/^03\d{9}$/.test(phone)) {
      return setError('Phone must be 11 digits starting with 03.');
    }
    if (!/^\d{13}$/.test(cnic)) {
      return setError('CNIC must be exactly 13 digits.');
    }

    setLoading(true);
    try {
      const form = new FormData();
      form.append('fullName', fullName);
      form.append('phone', phone);
      form.append('city', city);
      form.append('area', area);
      form.append('cnic', cnic);
      if (profilePic)  form.append('profilePic', profilePic);
      if (cnicPicture) form.append('cnicPicture', cnicPicture);

      await API.post('/auth/register', form);

      // send verification email after profile is saved
      await sendEmailVerification(auth.currentUser);

      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        <div style={styles.logo}>Udhaari</div>
        <div style={styles.subtitle}>
          {step === 1 && 'Create your account'}
          {step === 2 && 'Complete your profile'}
          {step === 3 && 'Check your email'}
        </div>

        {/* step indicators */}
        <div style={styles.steps}>
          {[1, 2, 3].map((s) => (
            <div key={s} style={{
              ...styles.stepDot,
              background: step >= s ? '#7c5cfc' : '#ffffff15',
              boxShadow: step === s ? '0 0 10px #7c5cfc' : 'none',
            }} />
          ))}
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {/* ── STEP 1: credentials ── */}
        {step === 1 && (
          <form onSubmit={handleStep1}>
            <Field label="Email" type="email" value={email}
              onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
            <Field label="Password" type="password" value={password}
              onChange={e => setPassword(e.target.value)} placeholder="min 6 characters" />
            <Field label="Confirm Password" type="password" value={confirm}
              onChange={e => setConfirm(e.target.value)} placeholder="repeat password" />
            <Btn loading={loading}>Continue →</Btn>
          </form>
        )}

        {/* ── STEP 2: profile ── */}
        {step === 2 && (
          <form onSubmit={handleStep2}>
            <Field label="Full Name" value={fullName}
              onChange={e => setFullName(e.target.value)} placeholder="Yousuf Ahmed" />
            <Field label="Phone Number" value={phone}
              onChange={e => setPhone(e.target.value)} placeholder="03001234567" />
            <div style={styles.row}>
              <Field label="City" value={city}
                onChange={e => setCity(e.target.value)} placeholder="Lahore" />
              <Field label="Area (optional)" value={area}
                onChange={e => setArea(e.target.value)} placeholder="DHA Phase 5" />
            </div>
            <Field label="CNIC Number" value={cnic}
              onChange={e => setCnic(e.target.value)} placeholder="3520112345671" />
            <FileField label="Profile Picture (optional)"
              onChange={e => setProfilePic(e.target.files[0])} />
            <FileField label="CNIC Picture (optional)"
              onChange={e => setCnicPicture(e.target.files[0])} />
            <Btn loading={loading}>Save Profile →</Btn>
            <button type="button" onClick={() => setStep(1)} style={styles.back}>
              ← Back
            </button>
          </form>
        )}

        {/* ── STEP 3: verify email ── */}
        {step === 3 && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✉️</div>
            <p style={{ color: '#ccc', lineHeight: 1.7, marginBottom: '1.5rem' }}>
              A verification link has been sent to<br />
              <strong style={{ color: '#fff' }}>{email}</strong>
              <br /><br />
              Click the link in your email to verify your account,
              then come back and log in.
            </p>
            <button onClick={() => navigate('/login')} style={styles.primaryBtn}>
              Go to Login
            </button>
          </div>
        )}

        {step !== 3 && (
          <p style={styles.switchText}>
            Already have an account?{' '}
            <Link to="/login" style={styles.link}>Log in</Link>
          </p>
        )}
      </div>
    </div>
  );
}

// ── small reusable components ──

function Field({ label, type = 'text', value, onChange, placeholder }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={styles.label}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={!label.includes('optional')}
        style={styles.input}
      />
    </div>
  );
}

function FileField({ label, onChange }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={styles.label}>{label}</label>
      <input type="file" accept="image/*,.pdf" onChange={onChange}
        style={{ ...styles.input, padding: '0.5rem' }} />
    </div>
  );
}

function Btn({ loading, children }) {
  return (
    <button type="submit" disabled={loading} style={{
      ...styles.primaryBtn,
      opacity: loading ? 0.7 : 1,
      cursor: loading ? 'not-allowed' : 'pointer',
    }}>
      {loading ? 'Please wait...' : children}
    </button>
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
    maxWidth: '460px',
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
  steps: {
    display: 'flex',
    gap: '8px',
    marginBottom: '1.5rem',
  },
  stepDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    transition: 'all 0.3s',
  },
  error: {
    background: '#ff5e7815',
    border: '1px solid #ff5e7830',
    color: '#ff5e78',
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    fontSize: '0.875rem',
    marginBottom: '1rem',
  },
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
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem',
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
    marginTop: '0.5rem',
    letterSpacing: '0.02em',
  },
  back: {
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
