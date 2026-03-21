// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';

function HomePage() {
  const { user } = useAuth();
  return (
    <div style={{
      minHeight: '100vh', background: '#080810', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: '1rem', fontFamily: 'system-ui',
    }}>
      <h1 style={{ color: '#8b5cf6', fontSize: '2rem', fontWeight: 800 }}>Udhaari</h1>
      {user && (
        <>
          <p>Welcome, <strong>{user.fullName}</strong></p>
          <p style={{ color: '#555', fontSize: '0.85rem' }}>Role: {user.role}</p>
          <button onClick={() => {
            import('firebase/auth').then(({ getAuth, signOut }) => {
              signOut(getAuth());
              localStorage.removeItem('udhaari_user');
              localStorage.removeItem('udhaari_pending_profile');
              localStorage.removeItem('udhaari_pending_email');
              window.location.href = '/auth';
            });
          }} style={{
            padding: '0.6rem 1.5rem', background: '#8b5cf6',
            border: 'none', borderRadius: '10px', color: '#fff',
            fontWeight: 700, cursor: 'pointer',
          }}>
            Logout
          </button>
        </>
      )}
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/auth" />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth"   element={<AuthPage />} />
          <Route path="/login"  element={<Navigate to="/auth" />} />
          <Route path="/signup" element={<Navigate to="/auth" />} />
          <Route path="/" element={
            <ProtectedRoute><HomePage /></ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/auth" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
