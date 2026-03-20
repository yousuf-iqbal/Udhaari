// src/api/axios.js
// configured axios instance
// automatically attaches firebase token to every request

import axios from 'axios';
import { auth } from '../config/firebase';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// before every request, get the current user's token and attach it
API.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;