export const API_URL = import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' 
    ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:8000' : '/api')
    : 'http://localhost:8000');
