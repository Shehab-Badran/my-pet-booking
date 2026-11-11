// Production and Development API Configuration
const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined') {
    const { hostname, port, origin } = window.location;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
    if (isLocalhost && port !== '8000') {
      return `http://${hostname}:8000`;
    }
    return origin;
  }
  return 'http://127.0.0.1:8000';
};

export const API_BASE_URL = getBaseUrl();
