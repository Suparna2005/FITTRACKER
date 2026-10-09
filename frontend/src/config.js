export const API_URL = import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' 
    ? (window.location.hostname !== 'localhost' ? '/api' : 'http://localhost:8000')
    : 'http://localhost:8000');
