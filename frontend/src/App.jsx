import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';

import Layout from './components/Layout';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Calculator from './pages/Calculator';
import Tariff from './pages/Tariff';
import LiveMeter from './pages/LiveMeter';
import Insights from './pages/Insights';
import Renewables from './pages/Renewables';
import BillHistory from './pages/BillHistory';
import Notifications from './pages/Notifications';
import Payment from './pages/Payment';
import AdminDashboard from './pages/AdminDashboard';
import AdminPortal from './pages/AdminPortal';

// Loading Spinner Component
const FullScreenLoader = () => (
    <div className="min-h-screen bg-darker flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
    </div>
);

// GUARD 1: Standard Consumer-Only Protection (Redirects Admin to /admin)
function ConsumerRoute({ children }) {
    const { user, loading } = useContext(AuthContext);
    
    if (loading) return <FullScreenLoader />;
    if (!user) return <Navigate to="/" />;
    if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
    return <Layout>{children}</Layout>;
}

// GUARD 2: Shared Protected Route (Accessible by both Consumer and Admin)
function SharedRoute({ children }) {
    const { user, loading } = useContext(AuthContext);
    
    if (loading) return <FullScreenLoader />;
    return user ? <Layout>{children}</Layout> : <Navigate to="/" />;
}

// GUARD 3: Strict Admin Protection (Redirects non-admin to /dashboard)
function AdminRoute({ children }) {
    const { user, loading } = useContext(AuthContext);
    
    if (loading) return <FullScreenLoader />;
    
    // If user is NOT an admin, kick them back to the standard dashboard
    return (user && user.role === 'ADMIN') ? <Layout>{children}</Layout> : <Navigate to="/dashboard" />;
}

function App() {
    const { user, loading } = useContext(AuthContext);

    if (loading) return <FullScreenLoader />;

    return (
        <Router>
            <Routes>
                {/* PUBLIC ROUTE */}
                <Route path="/" element={user ? <Navigate to={user.role === 'ADMIN' ? "/admin" : "/dashboard"} replace /> : <AuthPage />} />

                {/* CONSUMER EXCLUSIVE ROUTES */}
                <Route path="/dashboard" element={<ConsumerRoute><Dashboard /></ConsumerRoute>} />
                <Route path="/notifications" element={<ConsumerRoute><Notifications /></ConsumerRoute>} />
                <Route path="/payment" element={<ConsumerRoute><Payment /></ConsumerRoute>} />
                <Route path="/iot" element={<ConsumerRoute><LiveMeter /></ConsumerRoute>} />
                <Route path="/insights" element={<ConsumerRoute><Insights /></ConsumerRoute>} />
                <Route path="/renewables" element={<ConsumerRoute><Renewables /></ConsumerRoute>} />
                <Route path="/history" element={<ConsumerRoute><BillHistory /></ConsumerRoute>} />

                {/* SHARED REGULATORY & CALCULATION UTILITIES */}
                <Route path="/calculator" element={<SharedRoute><Calculator /></SharedRoute>} />
                <Route path="/tariff" element={<SharedRoute><Tariff /></SharedRoute>} />
                
                {/* ADMIN EXCLUSIVE ROUTES */}
                <Route path="/admin" element={<AdminRoute><AdminPortal /></AdminRoute>} />
                <Route path="/admin/system" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                
                {/* Fallback Route for 404s */}
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </Router>
    );
}

export default App;