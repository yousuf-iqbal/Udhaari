import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { AuthContext } from '../context/AuthContext';

export default function MyRequestsPage() {
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [myRequests, setMyRequests] = useState([]);
  const [myOffers, setMyOffers]     = useState([]);
  const [tab, setTab]               = useState('requests'); // 'requests' | 'offers'
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  useEffect(() => {
    if (!currentUser) { navigate('/login'); return; }

    const fetch = async () => {
      try {
        const token = await currentUser.getIdToken();
        const headers = { Authorization: `Bearer ${token}` };
        const [reqRes, offRes] = await Promise.all([
          API.get('/requests/my', { headers }),
          API.get('/offers/my', { headers }),
        ]);
        setMyRequests(reqRes.data);
        setMyOffers(offRes.data);
      } catch {
        setError('Could not load your data.');
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [currentUser]);

  if (loading) return <div style={styles.center}>Loading...</div>;
  if (error)   return <div style={styles.center}>{error}</div>;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>My Activity</h1>
        <button style={styles.newBtn} onClick={() => navigate('/requests/new')}>+ New Request</button>
      </div>

      {/* Tab switcher */}
      <div style={styles.tabs}>
        <button
          style={{ ...styles.tab, ...(tab === 'requests' ? styles.tabActive : {}) }}
          onClick={() => setTab('requests')}
        >
          My Requests ({myRequests.length})
        </button>
        <button
          style={{ ...styles.tab, ...(tab === 'offers' ? styles.tabActive : {}) }}
          onClick={() => setTab('offers')}
        >
          My Offers ({myOffers.length})
        </button>
      </div>

      {/* My Requests tab */}
      {tab === 'requests' && (
        <div>
          {myRequests.length === 0 ? (
            <div style={styles.empty}>
              <p>You haven't posted any requests yet.</p>
              <button style={styles.newBtn} onClick={() => navigate('/requests/new')}>Post your first request</button>
            </div>
          ) : (
            myRequests.map(r => (
              <div key={r.RequestID} style={styles.row} onClick={() => navigate(`/requests/${r.RequestID}`)}>
                <div style={styles.rowLeft}>
                  <div style={styles.rowTitle}>{r.Title}</div>
                  <div style={styles.rowMeta}>
                    {r.Category} · {r.City} · {r.DurationDays} day{r.DurationDays !== 1 ? 's' : ''} · {r.OfferCount} offer{r.OfferCount !== 1 ? 's' : ''}
                  </div>
                </div>
                <span style={{
                  ...styles.badge,
                  background: r.Status === 'open' ? '#dcfce7' : '#fee2e2',
                  color: r.Status === 'open' ? '#16a34a' : '#dc2626',
                }}>
                  {r.Status}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* My Offers tab */}
      {tab === 'offers' && (
        <div>
          {myOffers.length === 0 ? (
            <div style={styles.empty}>
              <p>You haven't made any offers yet.</p>
              <button style={styles.newBtn} onClick={() => navigate('/requests')}>Browse requests</button>
            </div>
          ) : (
            myOffers.map(o => (
              <div key={o.OfferID} style={styles.row} onClick={() => navigate(`/requests/${o.RequestID}`)}>
                <div style={styles.rowLeft}>
                  <div style={styles.rowTitle}>{o.RequestTitle}</div>
                  <div style={styles.rowMeta}>
                    {o.RequestCategory} · Requester: {o.RequesterName} · Rs. {o.OfferedPrice}
                  </div>
                  {o.Message && <div style={styles.offerMsg}>"{o.Message}"</div>}
                </div>
                <span style={{
                  ...styles.badge,
                  background: o.Status === 'accepted' ? '#dcfce7' : o.Status === 'rejected' ? '#fee2e2' : '#fef9c3',
                  color: o.Status === 'accepted' ? '#16a34a' : o.Status === 'rejected' ? '#dc2626' : '#92400e',
                }}>
                  {o.Status}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { maxWidth: 750, margin: '0 auto', padding: '40px 20px', fontFamily: 'Segoe UI, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  title: { fontSize: 28, fontWeight: 700, margin: 0, color: '#1a1a2e' },
  newBtn: { background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  tabs: { display: 'flex', gap: 8, marginBottom: 24, borderBottom: '2px solid #f0f0f0', paddingBottom: 0 },
  tab: { background: 'none', border: 'none', fontSize: 15, fontWeight: 600, color: '#888', cursor: 'pointer', padding: '10px 18px', borderRadius: '8px 8px 0 0', transition: 'all 0.2s' },
  tabActive: { color: '#4f46e5', background: '#ede9fe' },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', border: '1px solid #e5e7eb', borderRadius: 10, marginBottom: 10, cursor: 'pointer', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
  rowLeft: { flex: 1, marginRight: 16 },
  rowTitle: { fontWeight: 600, fontSize: 15, color: '#1a1a2e', marginBottom: 4 },
  rowMeta: { fontSize: 13, color: '#888' },
  offerMsg: { fontSize: 12, color: '#aaa', marginTop: 4, fontStyle: 'italic' },
  badge: { borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' },
  empty: { textAlign: 'center', padding: '60px 0', color: '#888' },
  center: { textAlign: 'center', marginTop: 80, fontSize: 16, color: '#666' },
};
