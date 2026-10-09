import pandas as pd
import numpy as np
import random
import os

def generate_realistic_data(rows=1000):
    data = []
    for _ in range(rows):
        # Month (1-12)
        month = random.randint(1, 12)
        
        # Approximate average temperature in Madurai/Chennai (Celsius)
        if month in [4, 5, 6]: # Summer peak
            avg_temp = random.uniform(32.0, 40.0)
            base_units = random.uniform(400, 800) # High AC usage
        elif month in [11, 12, 1]: # Winter/Monsoon
            avg_temp = random.uniform(24.0, 28.0)
            base_units = random.uniform(150, 350)
        else: # Transition months
            avg_temp = random.uniform(28.0, 34.0)
            base_units = random.uniform(250, 500)
            
        prev_month_units = base_units + random.uniform(-50, 50)
        
        # Target variable: Actual units consumed
        # Add some random noise to simulate household changes
        units_consumed = base_units + (avg_temp * 1.5) + random.uniform(-20, 20)
        
        data.append([month, round(avg_temp, 1), round(prev_month_units, 1), round(units_consumed, 1)])

    df = pd.DataFrame(data, columns=['month', 'avg_temp', 'prev_month_units', 'units_consumed'])
    
    filepath = os.path.join('datasets', 'tn_electricity_data.csv')
    df.to_csv(filepath, index=False)
    print(f"✅ Generated {rows} records of historical data at {filepath}")

if __name__ == "__main__":
    generate_realistic_data()