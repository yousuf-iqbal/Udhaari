// src/context/AuthContext.jsx
// stores the logged in user globally
// wrap your entire app with this so any component can access the user

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import API from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);  // user profile from your DB
  const [fbUser, setFbUser]   = useState(null);  // firebase user object
  const [loading, setLoading] = useState(true);  // true while checking auth state

  useEffect(() => {
    // firebase calls this whenever auth state changes (login, logout, page refresh)
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFbUser(firebaseUser);

    if (firebaseUser && firebaseUser.emailVerified) {
  try {
    const res = await API.post('/auth/login');
    setUser(res.data.user);
  } catch (err) {
    // 404 means profile not set up yet — this is fine for new Google users
    if (err.response?.status === 404) {
      setUser(null); // let the routing handle redirect
    } else {
      setUser(null);
    }
  }
}

      setLoading(false);
    });

    return unsubscribe; // cleanup on unmount
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, fbUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// custom hook — use this in any component to get the user
export const useAuth = () => useContext(AuthContext);
