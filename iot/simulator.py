import time
import requests
from smart_meter import SmartMeter

API_URL = "http://localhost:5000/api/iot/telemetry"
SERVICE_NUMBER = "04-123-001234" # Dummy service number for testing

def run_simulator():
    meter = SmartMeter(SERVICE_NUMBER)
    print(f"Starting Smart TN IoT Simulator for meter {SERVICE_NUMBER}...")
    print("Press Ctrl+C to stop.\n")
    
    while True:
        reading = meter.generate_reading()
        print(f"[{reading['timestamp']}] Power: {reading['powerKw']} kW | Cumulative: {reading['energyKwh']} kWh")
        
        try:
            # Post telemetry to the Node.js backend
            response = requests.post(API_URL, json=reading, timeout=5)
            if response.status_code == 201:
                print("   ✅ Telemetry accepted by backend.")
            else:
                print(f"   ⚠️ Backend rejected payload. Status: {response.status_code}")
        except requests.exceptions.RequestException as e:
            print("   ❌ Connection failed. Ensure the Node.js backend is running.")

        # Transmit every 5 seconds for rapid testing
        time.sleep(5)

if __name__ == "__main__":
    run_simulator()