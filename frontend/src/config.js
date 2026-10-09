export const API_URL = import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.hostname}:8000` 
    : 'http://localhost:8000');
