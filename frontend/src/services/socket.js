import { io } from 'socket.io-client';

const getSocketURL = () => {
    const rawTarget = import.meta.env.VITE_BACKEND_TARGET || 
                      import.meta.env.VITE_BACKEND_URL || 
                      import.meta.env.VITE_API_URL;
    if (rawTarget && rawTarget.trim()) {
        return rawTarget.trim().replace(/\/+$/, '').replace(/\/api$/, '');
    }
    if (typeof window !== 'undefined' && window.location) {
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            return 'https://smart-tn-backend.onrender.com';
        }
        return `http://${window.location.hostname}:5000`;
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
