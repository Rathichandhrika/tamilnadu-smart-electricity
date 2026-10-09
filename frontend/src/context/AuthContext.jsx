import { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Initial check: verify user session via HttpOnly cookie
    useEffect(() => {
        const checkAuthSession = async () => {
            try {
                const { data } = await api.get('/auth/me');
                if (data && data.success) {
                    setUser(data.data);
                } else {
                    setUser(null);
                }
            } catch {
                // Not authenticated or session expired
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        checkAuthSession();
    }, []);

    const login = async (email, password) => {
        try {
            const { data } = await api.post('/auth/login', { email, password });
            if (data && data.success) {
                setUser(data.data);
                return { success: true, user: data.data };
            }
            return {
                success: false,
                message: data?.message || 'Login failed. Please check your credentials.'
            };
        } catch (error) {
            return { 
                success: false, 
                message: error.response?.data?.message || error.message || 'Invalid email or password. Please try again.' 
            };
        }
    };

    const register = async (userData) => {
        try {
            const { data } = await api.post('/auth/register', userData);
            if (data && data.success) {
                setUser(data.data);
                return { success: true, user: data.data };
            }
            return {
                success: false,
                message: data?.message || 'Registration failed. Check your details.'
            };
        } catch (error) {
            return { 
                success: false, 
                message: error.response?.data?.message || error.message || 'Registration failed. Check your details.' 
            };
        }
    };

    const googleLogin = async (authPayload) => {
        try {
            const body = typeof authPayload === 'string' ? { credential: authPayload } : authPayload;
            const { data } = await api.post('/auth/google', body);
            if (data && data.success) {
                if (data.requiresOnboarding) {
                    return { success: true, requiresOnboarding: true, profile: data.profile };
                }
                setUser(data.data);
                return { success: true, user: data.data };
            }
            return {
                success: false,
                message: data?.message || 'Google authentication failed.'
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Google authentication failed.'
            };
        }
    };

    const logout = async () => {
        try {
            await api.post('/auth/logout');
        } catch (logoutErr) {
            console.error('Logout error:', logoutErr);
        } finally {
            setUser(null);
            sessionStorage.clear();
            localStorage.removeItem('smart_tn_admin_mode');
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, register, googleLogin, logout, loading, setUser }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}