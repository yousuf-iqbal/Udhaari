// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import API from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [fbUser, setFbUser]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFbUser(firebaseUser);

      if (firebaseUser) {
        // force reload — fixes emailVerified being stale after clicking link
        try { await firebaseUser.reload(); } catch {}
        const fresh = auth.currentUser;

        if (fresh?.emailVerified) {
          try {
            // try to login — get profile from DB
            const res = await API.post('/auth/login');
            setUser(res.data.user);
          } catch (err) {
            if (err.response?.status === 404) {
              // profile not in DB yet — check for pending profile data
              const pending = localStorage.getItem('udhaari_pending_profile');
              if (pending) {
                try {
                  const data = JSON.parse(pending);
                  const form = new FormData();
                  Object.entries(data).forEach(([k, v]) => { if (v) form.append(k, v); });
                  await API.post('/auth/register', form);
                  localStorage.removeItem('udhaari_pending_profile');
                  localStorage.removeItem('udhaari_pending_email');
                  // now fetch profile
                  const loginRes = await API.post('/auth/login');
                  setUser(loginRes.data.user);
                } catch {
                  setUser(null);
                }
              } else {
                setUser(null);
              }
            } else {
              setUser(null);
            }
          }
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, fbUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
