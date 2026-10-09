import random
from datetime import datetime, timezone

class SmartMeter:
    def __init__(self, service_number):
        self.service_number = service_number
        self.energy_kwh = 1500.0  # Starting cumulative energy reading on the meter
        self.base_load_kw = 0.2   # Always-on appliances (e.g., refrigerator, router)

    def generate_reading(self):
        # Realistic grid voltage fluctuations in India (220V - 240V)
        voltage = random.uniform(225.0, 235.0)
        
        # Simulate dynamic appliance load (e.g., AC turning on, TV, etc.)
        appliance_load = random.choice([0.0, 0.0, 0.5, 1.2, 2.5]) 
        power_kw = self.base_load_kw + appliance_load
        
        # Power Formula: P (W) = V * I * PF  =>  I = P / (V * PF)
        power_factor = random.uniform(0.90, 0.99)
        current = (power_kw * 1000) / (voltage * power_factor)
        
        # Accumulate energy (assuming simulator runs every few seconds, we scale it for testing)
        # In a real scenario running every 1 min, it would be power_kw / 60
        self.energy_kwh += (power_kw / 60.0)

        return {
            "serviceNumber": self.service_number,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "voltage": round(voltage, 2),
            "current": round(current, 2),
            "powerKw": round(power_kw, 3),
            "energyKwh": round(self.energy_kwh, 4),
            "powerFactor": round(power_factor, 2)
        }