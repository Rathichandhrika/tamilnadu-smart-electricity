import { io } from 'socket.io-client';

const getSocketURL = () => {
    if (import.meta.env.VITE_BACKEND_URL) return import.meta.env.VITE_BACKEND_URL;
    if (typeof window !== 'undefined' && window.location) {
        // If in production container (e.g. port 80/443) or HTTPS, connect to same origin
        if (window.location.port === '80' || window.location.port === '' || window.location.protocol === 'https:') {
            return window.location.origin;
        }
        const host = window.location.hostname || 'localhost';
        return `http://${host}:5000`;
    }
    return 'http://localhost:5000';
};

export const socket = io(getSocketURL(), {
    withCredentials: true,
    autoConnect: true,
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
});

export default socket;
