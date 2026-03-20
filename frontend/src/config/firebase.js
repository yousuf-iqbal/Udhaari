// src/config/firebase.js
// firebase config for the frontend
// this is safe to be public — firebase knows this

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';



const firebaseConfig = {
  apiKey:            "AIzaSyAZKnVOAMmdodRLwKGC3RjRoxzjkX-p5qQ",
  authDomain:        "udhaarii.firebaseapp.com",
  projectId:         "udhaarii",
  storageBucket:     "udhaarii.firebasestorage.app",
  messagingSenderId: "763317305909",
  appId:             "1:763317305909:web:c33b914497b224da4f677c",
};

const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();