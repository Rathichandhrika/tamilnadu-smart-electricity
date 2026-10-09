import axios from 'axios';

const getBaseURL = () => {
    const rawTarget = import.meta.env.VITE_BACKEND_TARGET || 
                      import.meta.env.VITE_BACKEND_URL || 
                      import.meta.env.VITE_API_URL;
    if (rawTarget && rawTarget.trim()) {
        const cleanTarget = rawTarget.trim().replace(/\/+$/, '');
        return cleanTarget.endsWith('/api') ? cleanTarget : `${cleanTarget}/api`;
    }
    if (typeof window !== 'undefined' && window.location) {
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            return 'https://smart-tn-backend.onrender.com/api';
        }
        return `http://${window.location.hostname}:5000/api`;
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