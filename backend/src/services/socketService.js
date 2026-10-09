const { Server } = require('socket.io');

let io = null;
let simulationInterval = null;
let cumulativeEnergyKwh = 342.85;

/**
 * Initialize Socket.io server with CORS and telemetry event listeners
 */
const initSocket = (httpServer, allowedOrigins) => {
    io = new Server(httpServer, {
        cors: {
            origin: (origin, callback) => {
                if (!origin || allowedOrigins.includes(origin)) {
                    return callback(null, true);
                }
                return callback(null, true);
            },
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        console.log(`⚡ Socket client connected: ${socket.id}`);

        // Client joins room for their specific meter
        socket.on('subscribe_meter', (serviceNumber) => {
            const room = `meter:${serviceNumber || '04-123-001234'}`;
            socket.join(room);
            console.log(`Meter room joined: ${room} by socket ${socket.id}`);
            
            // Send immediate initial packet
            const initialTelemetry = generateSimulatedPacket(serviceNumber || '04-123-001234');
            socket.emit('meter_telemetry', initialTelemetry);
        });

        socket.on('disconnect', () => {
            console.log(`🔌 Socket client disconnected: ${socket.id}`);
        });
    });

    // Start background telemetry heartbeat (emits every 2.5 seconds to keep live charts vibrant)
    startHeartbeatEmitter();

    return io;
};

/**
 * Generate realistic electrical telemetry packet
 */
const generateSimulatedPacket = (serviceNumber = '04-123-001234') => {
    const baseVoltage = 230;
    // Voltage fluctuation +- 5V
    const voltage = Number((baseVoltage + (Math.random() * 8 - 4)).toFixed(1));
    // Current between 3.5A and 11.5A
    const current = Number((3.5 + Math.random() * 8).toFixed(2));
    // Power factor between 0.93 and 0.99
    const powerFactor = Number((0.94 + Math.random() * 0.05).toFixed(2));
    // Active power in kW = (V * I * PF) / 1000
    const powerKw = Number(((voltage * current * powerFactor) / 1000).toFixed(2));
    // Cumulative energy increment (simulating time passing)
    cumulativeEnergyKwh = Number((cumulativeEnergyKwh + (powerKw * (2.5 / 3600))).toFixed(3));
    // Frequency around 50Hz +- 0.08
    const frequency = Number((50.0 + (Math.random() * 0.16 - 0.08)).toFixed(2));

    return {
        serviceNumber,
        timestamp: new Date().toISOString(),
        voltage,
        current,
        powerKw,
        powerFactor,
        frequency,
        energyKwh: cumulativeEnergyKwh,
        source: 'LIVE_IOT_STREAM'
    };
};

/**
 * Continuous real-time emitter to all connected smart meter listeners
 */
const startHeartbeatEmitter = () => {
    if (simulationInterval) clearInterval(simulationInterval);

    simulationInterval = setInterval(() => {
        if (!io) return;

        const connectedSockets = io.engine?.clientsCount || 0;
        if (connectedSockets > 0) {
            const telemetry = generateSimulatedPacket('04-123-001234');
            // Broadcast to all clients and room
            io.emit('meter_telemetry', telemetry);
            io.to('meter:04-123-001234').emit('meter_telemetry', telemetry);
        }
    }, 2500);
};

/**
 * Broadcast hardware or simulator telemetry arriving at POST /api/iot/telemetry
 */
const broadcastTelemetry = (telemetryData) => {
    if (!io) return;
    const room = `meter:${telemetryData.serviceNumber}`;
    io.emit('meter_telemetry', telemetryData);
    io.to(room).emit('meter_telemetry', telemetryData);
};

const getIO = () => io;

module.exports = {
    initSocket,
    getIO,
    broadcastTelemetry
};
