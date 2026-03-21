import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';

export default function RequestBoardPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    API.get('/requests')
      .then(res => setRequests(res.data))
      .catch(() => setError('Could not load requests.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={styles.center}>Loading requests...</div>;
  if (error)   return <div style={styles.center}>{error}</div>;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Request Board</h1>
          <p style={styles.subtitle}>Browse what people need — make an offer if you can help</p>
        </div>
        <button style={styles.postBtn} onClick={() => navigate('/requests/new')}>
          + Post a Request
        </button>
      </div>

      {requests.length === 0 ? (
        <div style={styles.empty}>
          <p>No open requests yet.</p>
          <button style={styles.postBtn} onClick={() => navigate('/requests/new')}>
            Be the first to post
          </button>
        </div>
      ) : (
        <div style={styles.grid}>
          {requests.map(r => (
            <div key={r.RequestID} style={styles.card} onClick={() => navigate(`/requests/${r.RequestID}`)}>
              <div style={styles.cardTop}>
                <span style={styles.category}>{r.Category}</span>
                <span style={styles.offerCount}>{r.OfferCount} offer{r.OfferCount !== 1 ? 's' : ''}</span>
              </div>
              <h3 style={styles.cardTitle}>{r.Title}</h3>
              <p style={styles.cardDesc}>{r.Description}</p>
              <div style={styles.cardFooter}>
                <span style={styles.meta}>📍 {r.City}{r.Area ? `, ${r.Area}` : ''}</span>
                <span style={styles.meta}>⏱ {r.DurationDays} day{r.DurationDays !== 1 ? 's' : ''}</span>
                <span style={styles.meta}>👤 {r.RequesterName}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { maxWidth: 1100, margin: '0 auto', padding: '40px 20px', fontFamily: 'Segoe UI, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 },
  title: { fontSize: 32, fontWeight: 700, margin: 0, color: '#1a1a2e' },
  subtitle: { margin: '6px 0 0', color: '#666', fontSize: 15 },
  postBtn: { background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 22px', fontSize: 15, fontWeight: 600, cursor: 'pointer' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, cursor: 'pointer', transition: 'box-shadow 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  category: { background: '#ede9fe', color: '#4f46e5', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600 },
  offerCount: { fontSize: 13, color: '#888', fontWeight: 500 },
  cardTitle: { fontSize: 17, fontWeight: 700, margin: '0 0 8px', color: '#1a1a2e' },
  cardDesc: { fontSize: 14, color: '#555', margin: '0 0 14px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  cardFooter: { display: 'flex', flexWrap: 'wrap', gap: 10 },
  meta: { fontSize: 12, color: '#888' },
  center: { textAlign: 'center', marginTop: 80, fontSize: 16, color: '#666' },
  empty: { textAlign: 'center', marginTop: 80, color: '#666' },
};
