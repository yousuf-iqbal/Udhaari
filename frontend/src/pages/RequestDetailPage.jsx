import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { AuthContext } from '../context/AuthContext';

export default function RequestDetailPage() {
  const { id } = useParams();
  const { currentUser, userProfile } = useContext(AuthContext);
  const navigate = useNavigate();

  const [request, setRequest]   = useState(null);
  const [offers, setOffers]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  // offer form
  const [offerPrice, setOfferPrice]     = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [offerError, setOfferError]     = useState('');
  const [offerSuccess, setOfferSuccess] = useState('');
  const [submitting, setSubmitting]     = useState(false);

  // action feedback
  const [actionMsg, setActionMsg] = useState('');

  const fetchData = async () => {
    try {
      const [reqRes, offersRes] = await Promise.all([
        API.get(`/requests/${id}`),
        API.get(`/offers/request/${id}`),
      ]);
      setRequest(reqRes.data);
      setOffers(offersRes.data);
    } catch {
      setError('Could not load this request.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const isOwner = userProfile && request && userProfile.UserID === request.RequesterID;

  const handleOffer = async e => {
    e.preventDefault();
    setOfferError('');
    setOfferSuccess('');

    if (!currentUser) { navigate('/login'); return; }
    if (!offerPrice)  { setOfferError('Price is required.'); return; }

    try {
      setSubmitting(true);
      const token = await currentUser.getIdToken();
      await API.post('/offers', {
        requestID: Number(id),
        offeredPrice: Number(offerPrice),
        message: offerMessage || undefined,
      }, { headers: { Authorization: `Bearer ${token}` } });

      setOfferSuccess('Offer submitted successfully!');
      setOfferPrice('');
      setOfferMessage('');
      fetchData(); // refresh offer count
    } catch (err) {
      setOfferError(err.response?.data?.error || 'Could not submit offer.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccept = async (offerID) => {
    if (!currentUser) return;
    try {
      const token = await currentUser.getIdToken();
      await API.patch(`/offers/${offerID}/accept`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setActionMsg('Offer accepted! Request is now closed.');
      fetchData();
    } catch (err) {
      setActionMsg(err.response?.data?.error || 'Could not accept offer.');
    }
  };

  const handleReject = async (offerID) => {
    if (!currentUser) return;
    try {
      const token = await currentUser.getIdToken();
      await API.patch(`/offers/${offerID}/reject`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setActionMsg('Offer rejected.');
      fetchData();
    } catch (err) {
      setActionMsg(err.response?.data?.error || 'Could not reject offer.');
    }
  };

  const handleClose = async () => {
    if (!currentUser) return;
    try {
      const token = await currentUser.getIdToken();
      await API.patch(`/requests/${id}/close`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setActionMsg('Request closed.');
      fetchData();
    } catch (err) {
      setActionMsg(err.response?.data?.error || 'Could not close request.');
    }
  };

  if (loading) return <div style={styles.center}>Loading...</div>;
  if (error)   return <div style={styles.center}>{error}</div>;
  if (!request) return null;

  const isClosed = request.Status === 'closed';

  return (
    <div style={styles.page}>
      <button style={styles.back} onClick={() => navigate('/requests')}>← Back to Board</button>

      {/* Request details */}
      <div style={styles.card}>
        <div style={styles.cardTop}>
          <span style={styles.category}>{request.Category}</span>
          <span style={{ ...styles.statusBadge, background: isClosed ? '#fee2e2' : '#dcfce7', color: isClosed ? '#dc2626' : '#16a34a' }}>
            {isClosed ? 'Closed' : 'Open'}
          </span>
        </div>
        <h1 style={styles.title}>{request.Title}</h1>
        <p style={styles.desc}>{request.Description}</p>
        <div style={styles.metaRow}>
          <span style={styles.meta}>📍 {request.City}{request.Area ? `, ${request.Area}` : ''}</span>
          <span style={styles.meta}>⏱ {request.DurationDays} day{request.DurationDays !== 1 ? 's' : ''}</span>
          <span style={styles.meta}>👤 {request.RequesterName}</span>
          <span style={styles.meta}>💬 {request.OfferCount} offer{request.OfferCount !== 1 ? 's' : ''}</span>
        </div>

        {isOwner && !isClosed && (
          <button style={styles.closeBtn} onClick={handleClose}>Close Request</button>
        )}
        {actionMsg && <div style={styles.actionMsg}>{actionMsg}</div>}
      </div>

      {/* Offers list — only visible to owner */}
      {isOwner && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Offers ({offers.length})</h2>
          {offers.length === 0 ? (
            <p style={styles.noOffers}>No offers yet.</p>
          ) : (
            offers.map(o => (
              <div key={o.OfferID} style={styles.offerCard}>
                <div style={styles.offerTop}>
                  <div>
                    <span style={styles.lenderName}>{o.LenderName}</span>
                    <span style={styles.lenderLocation}> · {o.LenderCity}{o.LenderArea ? `, ${o.LenderArea}` : ''}</span>
                  </div>
                  <span style={styles.price}>Rs. {o.OfferedPrice}</span>
                </div>
                {o.Message && <p style={styles.offerMsg}>{o.Message}</p>}
                <div style={styles.offerStatus}>
                  <span style={{
                    ...styles.statusPill,
                    background: o.Status === 'accepted' ? '#dcfce7' : o.Status === 'rejected' ? '#fee2e2' : '#fef9c3',
                    color: o.Status === 'accepted' ? '#16a34a' : o.Status === 'rejected' ? '#dc2626' : '#92400e',
                  }}>
                    {o.Status}
                  </span>
                  {!isClosed && o.Status === 'pending' && (
                    <div style={styles.offerActions}>
                      <button style={styles.acceptBtn} onClick={() => handleAccept(o.OfferID)}>Accept</button>
                      <button style={styles.rejectBtn} onClick={() => handleReject(o.OfferID)}>Reject</button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Make an offer form — visible to non-owners when request is open */}
      {!isOwner && !isClosed && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Make an Offer</h2>
          {!currentUser && (
            <p style={styles.loginPrompt}>
              <button style={styles.loginLink} onClick={() => navigate('/login')}>Log in</button> to make an offer.
            </p>
          )}
          {currentUser && (
            <form onSubmit={handleOffer} style={styles.offerForm}>
              {offerError   && <div style={styles.error}>{offerError}</div>}
              {offerSuccess && <div style={styles.success}>{offerSuccess}</div>}
              <label style={styles.label}>Your Price (Rs.) *</label>
              <input
                style={styles.input}
                type="number"
                min="1"
                placeholder="e.g. 500"
                value={offerPrice}
                onChange={e => setOfferPrice(e.target.value)}
              />
              <label style={styles.label}>Message (optional)</label>
              <textarea
                style={{ ...styles.input, height: 80, resize: 'vertical' }}
                placeholder="Describe what you're offering..."
                value={offerMessage}
                onChange={e => setOfferMessage(e.target.value)}
              />
              <button style={submitting ? styles.btnDisabled : styles.btn} type="submit" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Offer'}
              </button>
            </form>
          )}
        </div>
      )}

      {isClosed && !isOwner && (
        <div style={styles.closedNote}>This request is closed and no longer accepting offers.</div>
      )}
    </div>
  );
}

const styles = {
  page: { maxWidth: 700, margin: '0 auto', padding: '30px 20px', fontFamily: 'Segoe UI, sans-serif' },
  back: { background: 'none', border: 'none', color: '#4f46e5', fontSize: 14, cursor: 'pointer', marginBottom: 20, padding: 0, fontWeight: 600 },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '28px', marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  category: { background: '#ede9fe', color: '#4f46e5', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600 },
  statusBadge: { borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600 },
  title: { fontSize: 24, fontWeight: 700, margin: '0 0 10px', color: '#1a1a2e' },
  desc: { fontSize: 15, color: '#555', lineHeight: 1.6, margin: '0 0 16px' },
  metaRow: { display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 16 },
  meta: { fontSize: 13, color: '#888' },
  closeBtn: { background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 8 },
  actionMsg: { marginTop: 12, fontSize: 14, color: '#4f46e5', fontWeight: 500 },
  section: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '28px', marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  sectionTitle: { fontSize: 18, fontWeight: 700, margin: '0 0 18px', color: '#1a1a2e' },
  noOffers: { color: '#aaa', fontSize: 14 },
  offerCard: { border: '1px solid #f0f0f0', borderRadius: 10, padding: '16px', marginBottom: 12, background: '#fafafa' },
  offerTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  lenderName: { fontWeight: 600, fontSize: 14, color: '#1a1a2e' },
  lenderLocation: { fontSize: 13, color: '#888' },
  price: { fontWeight: 700, fontSize: 16, color: '#4f46e5' },
  offerMsg: { fontSize: 13, color: '#555', margin: '6px 0 10px' },
  offerStatus: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  statusPill: { borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 600 },
  offerActions: { display: 'flex', gap: 8 },
  acceptBtn: { background: '#dcfce7', color: '#16a34a', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  rejectBtn: { background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  offerForm: {},
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 6 },
  input: { width: '100%', padding: '11px 14px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, marginBottom: 16, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' },
  btn: { width: '100%', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, padding: '13px', fontSize: 15, fontWeight: 600, cursor: 'pointer' },
  btnDisabled: { width: '100%', background: '#a5b4fc', color: '#fff', border: 'none', borderRadius: 8, padding: '13px', fontSize: 15, fontWeight: 600, cursor: 'not-allowed' },
  error: { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 14 },
  success: { background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 14 },
  loginPrompt: { fontSize: 14, color: '#666' },
  loginLink: { background: 'none', border: 'none', color: '#4f46e5', fontWeight: 600, cursor: 'pointer', fontSize: 14, padding: 0 },
  closedNote: { textAlign: 'center', color: '#888', fontSize: 14, padding: '20px', background: '#f9fafb', borderRadius: 10 },
  center: { textAlign: 'center', marginTop: 80, fontSize: 16, color: '#666' },
};
