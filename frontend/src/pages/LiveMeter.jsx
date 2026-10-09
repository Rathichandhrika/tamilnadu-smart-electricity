import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import socket from '../services/socket';
import { useLanguage } from '../context/LanguageContext';
import { 
    Activity, Gauge, Zap, BatteryCharging, Radio, 
    Wifi, WifiOff, AlertTriangle, ShieldCheck, Cpu
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function LiveMeter() {
    const { t, language } = useLanguage();
    const [data, setData] = useState([]);
    const [latestReading, setLatestReading] = useState(null);
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [streamSource, setStreamSource] = useState('CONNECTING');
    const serviceNumber = "04-123-001234";

    const lastAlertRef = useRef(null);

    useEffect(() => {
        // 1. Initial REST Seed for past data
        const fetchInitialData = async () => {
            try {
                const res = await api.get(`/iot/telemetry/${serviceNumber}?limit=20`);
                if (res.data.success && res.data.data.length > 0) {
                    const formatted = res.data.data.map(reading => ({
                        time: new Date(reading.timestamp).toLocaleTimeString([], { hour12: false }),
                        power: Number(reading.powerKw?.toFixed(2)) || 0,
                        voltage: Number(reading.voltage?.toFixed(1)) || 230,
                        current: Number(reading.current?.toFixed(2)) || 0
                    })).reverse();

                    setData(formatted);
                    setLatestReading(res.data.data[0]);
                }
            } catch (err) {
                console.warn('Initial REST telemetry seed offline, awaiting WebSocket stream.');
            }
        };

        fetchInitialData();

        // 2. Socket.io Connection & Telemetry Subscription
        const handleConnect = () => {
            setIsConnected(true);
            setStreamSource('LIVE_SOCKET');
            socket.emit('subscribe_meter', serviceNumber);
        };

        const handleDisconnect = () => {
            setIsConnected(false);
            setStreamSource('DISCONNECTED');
        };

        const handleTelemetry = (packet) => {
            if (!packet) return;

            setLatestReading(packet);
            setIsConnected(true);
            setStreamSource('LIVE_SOCKET');

            const timeStr = new Date(packet.timestamp || Date.now()).toLocaleTimeString([], { hour12: false });
            const newPoint = {
                time: timeStr,
                power: Number(packet.powerKw?.toFixed(2)) || 0,
                voltage: Number(packet.voltage?.toFixed(1)) || 230,
                current: Number(packet.current?.toFixed(2)) || 0
            };

            setData(prev => {
                const updated = [...prev, newPoint];
                return updated.slice(-25); // Keep rolling 25 readings
            });
        };

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('meter_telemetry', handleTelemetry);

        if (socket.connected) {
            handleConnect();
        } else {
            socket.connect();
        }

        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('meter_telemetry', handleTelemetry);
        };
    }, [serviceNumber]);

    // Grid status checks
    const voltage = latestReading?.voltage || 230;
    const current = latestReading?.current || 5.2;
    const powerKw = latestReading?.powerKw || 1.15;
    const frequency = latestReading?.frequency || 50.0;
    const powerFactor = latestReading?.powerFactor || 0.96;
    const energyKwh = latestReading?.energyKwh || 342.8;

    const isUnderVoltage = voltage < 215;
    const isOverload = powerKw > 4.5;

    return (
        <div className="space-y-8 w-full">
            {/* Header with Live WebSocket Status Badge */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-panelBorder pb-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                        <Activity className="text-gold-500" size={30} />
                        {t('liveTelemetryTitle')}
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        {t('liveTelemetrySubtitle')}
                    </p>
                </div>

                <div className="flex items-center gap-3 bg-panel border border-panelBorder px-4 py-2 rounded-2xl self-start sm:self-auto shadow-lg">
                    <span className="relative flex h-3 w-3">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                            isConnected ? 'bg-emerald-400' : 'bg-rose-500'
                        }`}></span>
                        <span className={`relative inline-flex rounded-full h-3 w-3 ${
                            isConnected ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}></span>
                    </span>
                    <div className="text-left font-mono">
                        <span className="text-xs font-bold text-white block">
                            {isConnected ? t('streamOnline') : t('streamOffline')}
                        </span>
                        <span className="text-[10px] text-slate-400">
                            Meter: {serviceNumber}
                        </span>
                    </div>
                </div>
            </div>

            {/* Live Grid Health Alert Banner */}
            {isUnderVoltage ? (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-center gap-2.5 animate-pulse">
                    <AlertTriangle size={18} />
                    <span className="font-bold">{t('underVoltageWarning')}</span> (Observed: {voltage}V)
                </div>
            ) : isOverload ? (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5 animate-pulse">
                    <AlertTriangle size={18} />
                    <span className="font-bold">{t('overloadWarning')}</span> (Observed: {powerKw} kW)
                </div>
            ) : (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2.5">
                    <ShieldCheck size={16} />
                    <span>{t('gridStatusNormal')}</span>
                </div>
            )}

            {/* 6 Real-Time Electrical Telemetry Gauges */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {/* Active Power */}
                <div className="bg-panel border border-gold-500/30 p-4 rounded-2xl relative overflow-hidden shadow-lg group hover:border-gold-500 transition flex flex-col justify-between h-full min-h-[92px]">
                    <div className="flex justify-between items-center text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                        <span>{t('activePower')}</span>
                        <Zap size={14} className="text-gold-500" />
                    </div>
                    <p className="mt-2 text-2xl font-bold font-mono text-gold-400 tracking-tight">
                        {powerKw.toFixed(2)} <span className="text-xs font-sans font-normal text-slate-400">kW</span>
                    </p>
                </div>

                {/* Supply Voltage */}
                <div className={`p-4 rounded-2xl border relative overflow-hidden shadow-lg transition flex flex-col justify-between h-full min-h-[92px] ${
                    isUnderVoltage ? 'bg-amber-950/20 border-amber-500/40' : 'bg-panel border-panelBorder'
                }`}>
                    <div className="flex justify-between items-center text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                        <span>{t('supplyVoltage')}</span>
                        <Gauge size={14} className="text-blue-400" />
                    </div>
                    <p className={`mt-2 text-2xl font-bold font-mono tracking-tight ${
                        isUnderVoltage ? 'text-amber-400' : 'text-white'
                    }`}>
                        {voltage.toFixed(1)} <span className="text-xs font-sans font-normal text-slate-400">V</span>
                    </p>
                </div>

                {/* Line Current */}
                <div className="bg-panel border border-panelBorder p-4 rounded-2xl relative overflow-hidden shadow-lg flex flex-col justify-between h-full min-h-[92px]">
                    <div className="flex justify-between items-center text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                        <span>{t('lineCurrent')}</span>
                        <Activity size={14} className="text-rose-400" />
                    </div>
                    <p className="mt-2 text-2xl font-bold font-mono text-white tracking-tight">
                        {current.toFixed(2)} <span className="text-xs font-sans font-normal text-slate-400">A</span>
                    </p>
                </div>

                {/* Cumulative Energy */}
                <div className="bg-panel border border-panelBorder p-4 rounded-2xl relative overflow-hidden shadow-lg flex flex-col justify-between h-full min-h-[92px]">
                    <div className="flex justify-between items-center text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                        <span>{t('cumulativeMeter')}</span>
                        <BatteryCharging size={14} className="text-emerald-400" />
                    </div>
                    <p className="mt-2 text-2xl font-bold font-mono text-emerald-400 tracking-tight">
                        {energyKwh.toFixed(2)} <span className="text-xs font-sans font-normal text-slate-400">kWh</span>
                    </p>
                </div>

                {/* Power Factor */}
                <div className="bg-panel border border-panelBorder p-4 rounded-2xl relative overflow-hidden shadow-lg flex flex-col justify-between h-full min-h-[92px]">
                    <div className="flex justify-between items-center text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                        <span>{t('powerFactor')}</span>
                        <Cpu size={14} className="text-purple-400" />
                    </div>
                    <p className="mt-2 text-2xl font-bold font-mono text-purple-300 tracking-tight">
                        {powerFactor.toFixed(2)} <span className="text-xs font-sans font-normal text-slate-400">PF</span>
                    </p>
                </div>

                {/* Grid Frequency */}
                <div className="bg-panel border border-panelBorder p-4 rounded-2xl relative overflow-hidden shadow-lg flex flex-col justify-between h-full min-h-[92px]">
                    <div className="flex justify-between items-center text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                        <span>{t('gridFrequency')}</span>
                        <Radio size={14} className="text-cyan-400" />
                    </div>
                    <p className="mt-2 text-2xl font-bold font-mono text-cyan-300 tracking-tight">
                        {frequency.toFixed(2)} <span className="text-xs font-sans font-normal text-slate-400">Hz</span>
                    </p>
                </div>
            </div>

            {/* REAL-TIME TELEMETRY GRAPH */}
            <div className="bg-panel border border-panelBorder p-6 rounded-2xl shadow-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-base font-bold text-white flex items-center gap-2">
                            <Radio size={18} className="text-gold-500 animate-pulse" /> 
                            {t('activeLoadSpectrum')}
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                            {t('simulatedNotice')}
                        </p>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono">
                        <span className="flex items-center gap-1.5 text-gold-400">
                            <span className="w-2.5 h-2.5 rounded-full bg-gold-400"></span> {t('powerLegend')}
                        </span>
                        <span className="flex items-center gap-1.5 text-blue-400">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span> {t('voltageLegend')}
                        </span>
                    </div>
                </div>

                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 10, right: 15, left: -5, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                            <XAxis 
                                dataKey="time" 
                                stroke="#64748b" 
                                tick={{ fontSize: 11 }} 
                            />
                            <YAxis 
                                yAxisId="left"
                                stroke="#f59e0b" 
                                domain={['auto', 'auto']} 
                                tick={{ fontSize: 11 }} 
                                unit=" kW"
                            />
                            <YAxis 
                                yAxisId="right"
                                orientation="right"
                                stroke="#38bdf8" 
                                domain={[210, 250]} 
                                tick={{ fontSize: 11 }} 
                                unit=" V"
                            />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: '#090d16', 
                                    borderColor: '#1e293b', 
                                    borderRadius: '12px', 
                                    color: '#f8fafc',
                                    fontSize: '12px',
                                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.7)'
                                }}
                            />
                            <Line 
                                name={t('powerLegend')}
                                yAxisId="left"
                                type="monotone" 
                                dataKey="power" 
                                stroke="#f59e0b" 
                                strokeWidth={2.5}
                                dot={{ fill: '#f59e0b', r: 2.5 }}
                                activeDot={{ r: 5, fill: '#fbbf24' }} 
                                isAnimationActive={false}
                            />
                            <Line 
                                name={t('voltageLegend')}
                                yAxisId="right"
                                type="monotone" 
                                dataKey="voltage" 
                                stroke="#38bdf8" 
                                strokeWidth={1.5}
                                strokeDasharray="4 4"
                                dot={false}
                                isAnimationActive={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}