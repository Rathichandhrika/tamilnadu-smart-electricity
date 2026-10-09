import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { ShieldAlert, Users, Database, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [consumers, setConsumers] = useState([]);

    useEffect(() => {
        const fetchAdminData = async () => {
            try {
                const [statsRes, alertsRes, consumersRes] = await Promise.all([
                    api.get('/admin/stats'),
                    api.get('/alerts'),
                    api.get('/admin/consumers')
                ]);
                if (statsRes.data.success) setStats(statsRes.data.data);
                if (alertsRes.data.success) setAlerts(alertsRes.data.data);
                if (consumersRes.data.success) setConsumers(consumersRes.data.data);
            } catch (error) {
                console.error("Admin Portal Error:", error);
            }
        };
        fetchAdminData();
    }, []);

    const handleResolve = async (id) => {
        try {
            await api.put(`/alerts/${id}/resolve`);
            setAlerts(alerts.filter(alert => alert._id !== id));
        } catch (error) {
            console.error("Resolve Error:", error);
        }
    };

    return (
        <div className="space-y-8 w-full">
            <div className="flex justify-between items-center pb-6 border-b border-panelBorder">
                <div className="flex items-center gap-3">
                    <ShieldAlert className="text-red-500" size={30} />
                    <div>
                        <h1 className="text-3xl font-extrabold text-white tracking-tight">
                            Admin <span className="text-red-500">Command Center</span>
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">
                            System telemetry, security incidents, and consumer database access.
                        </p>
                    </div>
                </div>
                <span className="text-xs font-mono font-bold px-3 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/30">
                    RBAC LEVEL 4
                </span>
            </div>

            {/* System KPIs */}
            {stats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    <div className="bg-panel border border-panelBorder p-5 rounded-xl flex flex-col justify-between h-full">
                        <div className="flex justify-between items-center text-slate-400 text-xs font-bold uppercase">
                            <span>Consumers</span>
                            <Users size={16} className="text-gold-500" />
                        </div>
                        <p className="mt-3 text-3xl font-bold font-mono text-white">{stats.totalUsers}</p>
                    </div>

                    <div className="bg-panel border border-panelBorder p-5 rounded-xl flex flex-col justify-between h-full">
                        <div className="flex justify-between items-center text-slate-400 text-xs font-bold uppercase">
                            <span>Smart Meters</span>
                            <Database size={16} className="text-emerald-400" />
                        </div>
                        <p className="mt-3 text-3xl font-bold font-mono text-emerald-400">{stats.totalMeters}</p>
                    </div>

                    <div className="bg-panel border border-panelBorder p-5 rounded-xl flex flex-col justify-between h-full">
                        <div className="flex justify-between items-center text-slate-400 text-xs font-bold uppercase">
                            <span>Telemetry Points</span>
                            <Database size={16} className="text-blue-400" />
                        </div>
                        <p className="mt-3 text-3xl font-bold font-mono text-white">{stats.totalTelemetry.toLocaleString()}</p>
                    </div>

                    <div className="bg-panel border border-panelBorder p-5 rounded-xl flex flex-col justify-between h-full">
                        <div className="flex justify-between items-center text-slate-400 text-xs font-bold uppercase">
                            <span>Bills Generated</span>
                            <Database size={16} className="text-purple-400" />
                        </div>
                        <p className="mt-3 text-3xl font-bold font-mono text-white">{stats.totalBills}</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Active Alerts */}
                <div className="bg-panel border border-panelBorder rounded-xl overflow-hidden">
                    <div className="p-4 bg-darker/60 border-b border-panelBorder flex justify-between items-center">
                        <h2 className="text-sm font-bold text-white flex items-center gap-2">
                            <AlertCircle size={16} className="text-red-400" /> Critical System Alerts
                        </h2>
                        <span className="text-xs font-mono text-slate-400">{alerts.length} Pending</span>
                    </div>
                    <div className="p-4 space-y-3 max-h-[420px] overflow-y-auto">
                        {alerts.length === 0 ? (
                            <p className="text-slate-500 text-xs text-center py-8">All alert threads resolved.</p>
                        ) : (
                            alerts.map(alert => (
                                <div key={alert._id} className="p-3 bg-darker border border-red-500/20 rounded-lg">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-bold text-red-400">{alert.type}</span>
                                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-500/20 text-red-300">
                                            {alert.severity}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-300 mb-3">{alert.message}</p>
                                    <button 
                                        onClick={() => handleResolve(alert._id)}
                                        className="w-full py-1 text-xs font-semibold bg-panel border border-panelBorder hover:border-emerald-500/40 text-slate-300 hover:text-emerald-400 rounded transition"
                                    >
                                        Mark as Resolved
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Consumer Records Table */}
                <div className="lg:col-span-2 bg-panel border border-panelBorder rounded-xl overflow-hidden">
                    <div className="p-4 bg-darker/60 border-b border-panelBorder">
                        <h2 className="text-sm font-bold text-white">Registered Consumer Ledger</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-panelBorder text-slate-400 uppercase tracking-wider">
                                    <th className="py-3 px-4">Service No.</th>
                                    <th className="py-3 px-4">User</th>
                                    <th className="py-3 px-4">Category</th>
                                    <th className="py-3 px-4">Load</th>
                                    <th className="py-3 px-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-panelBorder font-mono">
                                {consumers.map(cons => (
                                    <tr key={cons._id} className="hover:bg-darker/40 transition">
                                        <td className="py-3 px-4 text-gold-400 font-bold">{cons.serviceNumber}</td>
                                        <td className="py-3 px-4 font-sans text-slate-200">{cons.user?.name || 'N/A'}</td>
                                        <td className="py-3 px-4 text-slate-400">{cons.tariffCategory}</td>
                                        <td className="py-3 px-4 text-slate-300">{cons.sanctionedLoadKw} kW</td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                cons.user?.isActive 
                                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                            }`}>
                                                {cons.user?.isActive ? 'ACTIVE' : 'SUSPENDED'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}