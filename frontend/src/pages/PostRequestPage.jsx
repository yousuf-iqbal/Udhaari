import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { AuthContext } from '../context/AuthContext';

const CATEGORIES = ['Electronics', 'Furniture', 'Vehicles', 'Tools', 'Books', 'Clothing', 'Sports', 'Other'];

export default function PostRequestPage() {
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    city: '',
    area: '',
    durationDays: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');

    if (!currentUser) {
      navigate('/login');
      return;
    }

    if (!form.title || !form.description || !form.category || !form.city || !form.durationDays) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setLoading(true);
      const token = await currentUser.getIdToken();
      const res = await API.post('/requests', {
        ...form,
        durationDays: Number(form.durationDays),
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      navigate(`/requests/${res.data.request.RequestID}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not post request. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <button style={styles.back} onClick={() => navigate('/requests')}>← Back to Board</button>

      <div style={styles.card}>
        <h1 style={styles.title}>Post a Request</h1>
        <p style={styles.subtitle}>Tell lenders what you need and for how long</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <label style={styles.label}>Title *</label>
          <input
            style={styles.input}
            name="title"
            placeholder="e.g. Need a DSLR camera for 3 days"
            value={form.title}
            onChange={handleChange}
          />

          <label style={styles.label}>Description *</label>
          <textarea
            style={{ ...styles.input, height: 100, resize: 'vertical' }}
            name="description"
            placeholder="Describe what you need and why"
            value={form.description}
            onChange={handleChange}
          />

          <label style={styles.label}>Category *</label>
          <select style={styles.input} name="category" value={form.category} onChange={handleChange}>
            <option value="">Select a category</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <div style={styles.row}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>City *</label>
              <input
                style={styles.input}
                name="city"
                placeholder="e.g. Lahore"
                value={form.city}
                onChange={handleChange}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Area</label>
              <input
                style={styles.input}
                name="area"
                placeholder="e.g. DHA Phase 5"
                value={form.area}
                onChange={handleChange}
              />
            </div>
          </div>

          <label style={styles.label}>Duration (days) *</label>
          <input
            style={styles.input}
            name="durationDays"
            type="number"
            min="1"
            placeholder="e.g. 3"
            value={form.durationDays}
            onChange={handleChange}
          />

          <button style={loading ? styles.btnDisabled : styles.btn} type="submit" disabled={loading}>
            {loading ? 'Posting...' : 'Post Request'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: { maxWidth: 620, margin: '0 auto', padding: '30px 20px', fontFamily: 'Segoe UI, sans-serif' },
  back: { background: 'none', border: 'none', color: '#4f46e5', fontSize: 14, cursor: 'pointer', marginBottom: 20, padding: 0, fontWeight: 600 },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '36px 32px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  title: { fontSize: 26, fontWeight: 700, margin: '0 0 6px', color: '#1a1a2e' },
  subtitle: { color: '#888', fontSize: 14, margin: '0 0 28px' },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 6 },
  input: { width: '100%', padding: '11px 14px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, marginBottom: 18, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' },
  row: { display: 'flex', gap: 16 },
  btn: { width: '100%', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, padding: '13px', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 4 },
  btnDisabled: { width: '100%', background: '#a5b4fc', color: '#fff', border: 'none', borderRadius: 8, padding: '13px', fontSize: 15, fontWeight: 600, cursor: 'not-allowed', marginTop: 4 },
  error: { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 14 },
};
