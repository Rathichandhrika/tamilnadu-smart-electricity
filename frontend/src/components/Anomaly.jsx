import React from 'react';
import EnergyInbox from './EnergyInbox';

/**
 * Anomaly Component (Phase 5.5: AI Energy Inbox)
 * Dedicated anomaly detection component replacing deprecated statistical scatter plots.
 * Evaluates:
 * 1. Phantom Load Detective (Mismatch Anomaly: estimated vs actual)
 * 2. Seasonal Bill Shock Predictor (Historical April/May jump)
 * 3. Usage Velocity Gauge (Pace Anomaly: days_passed / current_units / 60-day cliff)
 * 4. Traffic Light Health Score (Normal, Elevated, Abnormal)
 */
export default function Anomaly({ 
    defaultEstimated = 340, 
    initialCurrentUnits = 225, 
    initialDaysPassed = 24, 
    onAnomalyChange 
}) {
    return (
        <EnergyInbox 
            defaultEstimated={defaultEstimated}
            initialCurrentUnits={initialCurrentUnits}
            initialDaysPassed={initialDaysPassed}
            onAnomalyChange={onAnomalyChange}
        />
    );
}

export { EnergyInbox };
