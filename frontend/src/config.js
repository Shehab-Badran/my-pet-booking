// Production and Development API Configuration
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.port === '5173'
    ? 'http://127.0.0.1:8000'
    : (typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:8000'));
