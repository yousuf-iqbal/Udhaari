// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import SignupPage from './pages/SignupPage';
import LoginPage  from './pages/LoginPage';

// placeholder home page — replace with your real one later
function HomePage() {
  const { user } = useAuth();
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'sans-serif',
      flexDirection: 'column',
      gap: '1rem',
    }}>
      <h1 style={{ color: '#7c5cfc', fontSize: '2rem' }}>Udhaari</h1>
      {user ? (
        <>
          <p>Welcome, <strong>{user.fullName}</strong>!</p>
          <p style={{ color: '#888' }}>Role: {user.role}</p>
          <button
            onClick={() => {
              import('firebase/auth').then(({ getAuth, signOut }) => {
                signOut(getAuth());
                localStorage.removeItem('udhaari_user');
                window.location.href = '/login';
              });
            }}
            style={{
              padding: '0.6rem 1.5rem',
              background: '#ff5e78',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </>
      ) : (
        <p style={{ color: '#888' }}>Not logged in</p>
      )}
    </div>
  );
}

// protected route — redirects to login if not logged in
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login"  element={<LoginPage />} />
          <Route path="/" element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
