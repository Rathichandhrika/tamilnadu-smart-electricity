import axios from 'axios';

const getBaseURL = () => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    if (typeof window !== 'undefined' && window.location) {
        // In production container, behind reverse proxy, or HTTPS, use origin
        if (window.location.port === '80' || window.location.port === '' || window.location.protocol === 'https:') {
            return `${window.location.origin}/api`;
        }
        const host = window.location.hostname || 'localhost';
        return `http://${host}:5000/api`;
    }
    return 'http://localhost:5000/api';
};

const api = axios.create({
    baseURL: getBaseURL(),
    withCredentials: true, // Send and receive HttpOnly cookies with every request
    headers: {
        'Content-Type': 'application/json'
    }
});

// Response Interceptor: Handles 401 Unauthorized (expired/invalid session)
// Avoid intercepting auth endpoints so AuthPage can display validation errors and check session smoothly
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const url = error.config?.url || '';
        const isAuthCheck = url.includes('/auth/login') || 
                            url.includes('/auth/register') || 
                            url.includes('/auth/google') || 
                            url.includes('/auth/forgot-password') || 
                            url.includes('/auth/reset-password') || 
                            url.includes('/auth/me');

        if (error.response && error.response.status === 401 && !isAuthCheck) {
            if (window.location.pathname !== '/') {
                window.location.href = '/';
            }
        }
        return Promise.reject(error);
    }
);

export default api;