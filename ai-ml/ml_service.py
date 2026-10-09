import sys
import os
import io
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from gtts import gTTS
import joblib

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

app = Flask(__name__)
CORS(app)

# Load the trained ML model if available
model_path = os.path.join(os.path.dirname(__file__), 'models', 'rf_bill_predictor.pkl')
try:
    if os.path.exists(model_path):
        model = joblib.load(model_path)
        print("[SUCCESS] ML Model loaded successfully.")
    else:
        model = None
except Exception as e:
    print(f"[WARN] Error loading model: {e}")
    model = None

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "ok",
        "service": "Smart TN Electricity AI/ML Microservice",
        "modelLoaded": model is not None
    }), 200

@app.route('/predict', methods=['POST'])
def predict_usage():
    try:
        data = request.json or {}
        month = data.get('month', 10)
        avg_temp = data.get('avg_temp', 32.0)
        prev_month_units = data.get('prev_month_units', 450)
        
        if model:
            features = [[month, avg_temp, prev_month_units]]
            predicted_units = float(model.predict(features)[0])
        else:
            # Fallback estimation based on temperature and previous usage
            temp_factor = 1.0 + max(0.0, (avg_temp - 28.0) * 0.02)
            predicted_units = prev_month_units * temp_factor

        return jsonify({
            "success": True,
            "predicted_units": round(predicted_units, 2),
            "model_used": "RandomForestRegressor_v1" if model else "StatisticalPredictor_v1"
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 400

@app.route('/appliance-advice', methods=['POST'])
def appliance_advice():
    """
    AI Appliance Profiler & Optimization Engine for TANGEDCO LT-1A & LT-V Tariffs.
    Analyzes appliance wattage and daily usage hours, identifies the heaviest power consumers,
    and calculates precise reductions needed to stay below the 500-unit subsidy cliff.
    """
    try:
        data = request.json or {}
        appliances = data.get('appliances', [])
        connection_type = data.get('connectionType', 'LT-1A_DOMESTIC')
        
        # Calculate totals from appliances
        total_daily_kwh = 0.0
        processed_appliances = []

        for app_item in appliances:
            name = app_item.get('name', 'Generic Appliance')
            wattage = float(app_item.get('wattage', 100))
            hours = float(app_item.get('hoursPerDay', 1.0))
            quantity = float(app_item.get('quantity', 1))

            daily_kwh = (wattage * hours * quantity) / 1000.0
            bimonthly_kwh = daily_kwh * 60.0  # TANGEDCO 60-day billing cycle
            total_daily_kwh += daily_kwh

            processed_appliances.append({
                'name': name,
                'wattage': wattage,
                'hoursPerDay': hours,
                'quantity': quantity,
                'dailyKwh': round(daily_kwh, 2),
                'bimonthlyKwh': round(bimonthly_kwh, 1)
            })

        total_bimonthly_kwh = round(total_daily_kwh * 60.0, 1)

        # Sort appliances by heaviest consumption
        sorted_appliances = sorted(processed_appliances, key=lambda x: x['bimonthlyKwh'], reverse=True)
        top_appliance = sorted_appliances[0] if sorted_appliances else None

        # Add percentage contribution
        for item in processed_appliances:
            item['percentShare'] = round((item['bimonthlyKwh'] / max(1.0, total_bimonthly_kwh)) * 100.0, 1)

        actionable_tips = []
        cliff_status = 'SAFE'
        potential_savings_inr = 0.0
        headline = ""
        primary_action = ""

        # ==========================================
        # DOMESTIC TARIFF (LT-1A): 500-Unit Subsidy Cliff Analysis
        # ==========================================
        if connection_type == 'LT-1A_DOMESTIC':
            # Cliff threshold is 500 units bi-monthly
            CLIFF = 500.0

            if total_bimonthly_kwh > CLIFF:
                cliff_status = 'CROSSED_CLIFF'
                units_over = round(total_bimonthly_kwh - CLIFF, 1)

                # Cost comparison: In TANGEDCO, crossing 500 units loses 200 free units and jumps into high slabs
                # Under 500: 0-200 free, 201-400 @ 4.50, 401-500 @ 6.00 = ~₹1,500
                # Over 500 (e.g. 540): 0-100 @ 4.50, 101-400 @ 6.00, 401-500 @ 8.00, >500 @ 9.00 = ~₹3,410
                potential_savings_inr = round(1200 + (units_over * 9.0), 2)

                if top_appliance and top_appliance['wattage'] > 0:
                    # Daily kWh reduction needed to recover units_over over 60 days
                    daily_reduction_kwh = units_over / 60.0
                    hours_to_reduce = round(daily_reduction_kwh / (top_appliance['wattage'] / 1000.0), 1)
                    safe_hours = max(0.5, round(top_appliance['hoursPerDay'] - hours_to_reduce, 1))

                    primary_action = f"Reduce {top_appliance['name']} by {hours_to_reduce} hr/day (target: {safe_hours} hrs)"
                    headline = f"⚠️ 500-Unit Subsidy Cliff Crossed (+{units_over} units over threshold)"
                    
                    actionable_tips.append(
                        f"Reduce your {top_appliance['name']} by {hours_to_reduce} hr/day to drop below 500 units and restore your 200 free units subsidy."
                    )
                else:
                    primary_action = f"Reduce overall load by {units_over} units to retain subsidy"
                    headline = f"⚠️ Projected {total_bimonthly_kwh} units crosses 500-unit subsidy cliff"

                actionable_tips.append(
                    f"Crossing 500 units removes your 200 free units subsidy and escalates tariff rates up to ₹9.00/unit. Staying under saves ₹{potential_savings_inr:,.0f} bi-monthly."
                )

            elif 420.0 <= total_bimonthly_kwh <= CLIFF:
                cliff_status = 'NEAR_CLIFF'
                units_buffer = round(CLIFF - total_bimonthly_kwh, 1)
                headline = f"⚡ Close to 500-Unit Cliff (Only {units_buffer} units buffer remaining)"
                
                if top_appliance:
                    primary_action = f"Cap {top_appliance['name']} to current {top_appliance['hoursPerDay']} hrs/day"
                    actionable_tips.append(
                        f"You have only {units_buffer} units of leeway before crossing the 500-unit subsidy cutoff. Limit {top_appliance['name']} usage."
                    )
                potential_savings_inr = 850.0

            else:
                cliff_status = 'SAFE'
                headline = f"✅ Subsidized Tier Active ({total_bimonthly_kwh} units bi-monthly)"
                primary_action = "Maintain current energy schedule"
                actionable_tips.append(
                    f"Your consumption of {total_bimonthly_kwh} units is well within the low-tariff subsidized tier. You receive 200 free units."
                )
                potential_savings_inr = 300.0

        # ==========================================
        # INDUSTRIAL TARIFF (LT-IIIB): Peak Demand & MSME Optimization
        # ==========================================
        elif connection_type == 'LT-IIIB_INDUSTRIAL':
            headline = f"🏭 Industrial MSME Power Optimization ({total_bimonthly_kwh} kWh/cycle)"
            cliff_status = 'NEAR_CLIFF' if total_bimonthly_kwh > 2000 else 'SAFE'
            potential_savings_inr = round(total_bimonthly_kwh * 1.15, 2)
            primary_action = f"Shift {top_appliance['name']} operation outside grid peak hours (6-9 AM & 6-9 PM)" if top_appliance else "Balance 3-phase machinery distribution"
            actionable_tips.append(
                f"Under TANGEDCO LT-IIIB Industrial (₹7.65/unit + ₹600/kW fixed demand), staggering high-draw machinery prevents maximum demand overshoot penalties."
            )
            actionable_tips.append(
                "Maintain Automatic Power Factor Correction (APFC) capacitor banks above 0.92 PF to eliminate TNERC low-power-factor billing surcharges."
            )
            actionable_tips.append(
                "Schedule industrial air compressor and high-inertia loads during solar hours (10 AM - 3 PM) for peak demand shaving."
            )

        # ==========================================
        # COMMERCIAL TARIFF (LT-V): Non-Telescopic Threshold Analysis
        # ==========================================
        else:
            # Commercial cliff: >100 units triggers flat ₹10.45 for ALL units vs ₹6.65
            if total_bimonthly_kwh > 100:
                cliff_status = 'CROSSED_CLIFF'
                headline = f"🏢 High Commercial Tariff Triggered (>100 Units Flat Rate)"
                diff_rate = 10.45 - 6.65
                potential_savings_inr = round(total_bimonthly_kwh * diff_rate, 2)
                primary_action = "Curtail non-critical daytime lighting and HVAC loads"
                actionable_tips.append(
                    f"Under TANGEDCO LT-V Commercial rules, consuming >100 units escalates all {total_bimonthly_kwh} units to ₹10.45/unit flat (plus 5% tax). Lowering consumption saves ₹3.80 on every single unit."
                )
            else:
                cliff_status = 'SAFE'
                headline = f"✅ Base Commercial Rate Applied (₹6.65/unit)"
                primary_action = "Consumption is under 100 units commercial threshold"
                potential_savings_inr = 250.0

        # General high-efficiency actionable advice
        for item in sorted_appliances[:3]:
            nm = item['name'].upper()
            if 'AC' in nm:
                actionable_tips.append("Set Air Conditioner temperature to 24°C instead of 18°C to reduce compressor power draw by 18-24%.")
            elif 'GEYSER' in nm or 'HEATER' in nm:
                actionable_tips.append("Limit Water Geyser timer to 20 minutes before bathing; standby tank reheating wastes up to 1.5 kWh/day.")
            elif 'REFRIGERATOR' in nm:
                actionable_tips.append("Ensure refrigerator rear coils have at least 15 cm wall clearance for optimal compressor heat rejection.")
            elif 'MOTOR' in nm or 'PUMP' in nm:
                actionable_tips.append("Install VFDs (Variable Frequency Drives) on 3-phase induction motors to save 25-35% on partial speed operation.")
            elif 'COMPRESSOR' in nm:
                actionable_tips.append("Conduct an ultrasonic pneumatic leak inspection; repairing air line leaks saves up to ₹1,500 monthly.")
            elif 'WELD' in nm or 'CNC' in nm:
                actionable_tips.append("Power down idle CNC control transformers and welding inverters during shift changeovers to prevent standby losses.")

        return jsonify({
            "success": True,
            "headline": headline,
            "subsidyCliffStatus": cliff_status,
            "totalDailyKwh": round(total_daily_kwh, 2),
            "totalBimonthlyKwh": total_bimonthly_kwh,
            "potentialSavingsInr": potential_savings_inr,
            "primaryAction": primary_action,
            "highestConsumer": top_appliance['name'] if top_appliance else None,
            "highestConsumerPercent": top_appliance['percentShare'] if top_appliance else 0,
            "actionableTips": actionable_tips[:4],
            "applianceBreakdown": processed_appliances
        })

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 400

@app.route('/energy-inbox', methods=['POST'])
def energy_inbox():
    """
    Phase 5.5: AI Energy Inbox Anomaly Detection Microservice.
    Replaces old statistical scatter plots with plain-English contextual insight cards.
    1. Phantom Load Detective (Mismatch Anomaly)
    2. Seasonal Bill Shock Predictor (Historical April/May Jump)
    3. Usage Velocity Gauge (60-day pace anomaly)
    4. Traffic Light Health Score
    """
    try:
        data = request.json or {}
        estimated_units = float(data.get('estimated_units', 340))
        current_units = float(data.get('current_units', 225))
        days_passed = max(1, int(data.get('days_passed', 24)))
        previous_cycle_units = float(data.get('previous_cycle_units', 410))
        historical_bills = data.get('historical_bills', [])
        current_month = int(data.get('current_month', 4))  # Default April

        # -------------------------------------------------------------
        # 1. Feature 3: Usage Velocity Gauge (Pace Anomaly)
        # -------------------------------------------------------------
        daily_velocity = round(current_units / days_passed, 2)
        projected_units = round(daily_velocity * 60)

        # -------------------------------------------------------------
        # 2. Feature 4: Traffic Light Health Score
        # -------------------------------------------------------------
        if previous_cycle_units > 0:
            diff_pct = round(((projected_units - previous_cycle_units) / previous_cycle_units) * 100)
        else:
            diff_pct = 0

        if diff_pct > 25:
            health_score = {
                "grade": "ABNORMAL",
                "color": "RED",
                "label": "Abnormal",
                "percent_diff": diff_pct,
                "summary": f"{diff_pct}% spike compared to your normal billing habits. Immediate action advised."
            }
        elif diff_pct >= 10:
            health_score = {
                "grade": "ELEVATED",
                "color": "YELLOW",
                "label": "Elevated",
                "percent_diff": diff_pct,
                "summary": f"{diff_pct}% higher than last cycle. Keep heavy loads in check."
            }
        else:
            health_score = {
                "grade": "NORMAL",
                "color": "GREEN",
                "label": "Normal",
                "percent_diff": diff_pct,
                "summary": f"Matches your historical average baseline ({int(previous_cycle_units)} units)."
            }

        cards = []

        # -------------------------------------------------------------
        # 3. Feature 1: The \"Phantom Load\" Detective (Mismatch Anomaly)
        # -------------------------------------------------------------
        actual_units_to_compare = projected_units
        if estimated_units > 0 and actual_units_to_compare > (estimated_units * 1.20):
            leak_units = round(actual_units_to_compare - estimated_units)
            cards.append({
                "id": "phantom-leak",
                "type": "PHANTOM_LOAD",
                "severity": "HIGH",
                "border_color": "RED",
                "title": "⚠️ Unexplained Usage Detected",
                "title_ta": "⚠️ விளக்கப்படாத மின் பயன்பாடு கண்டறியப்பட்டது",
                "message": f"Your appliances should only use ~{int(estimated_units)} units, but your meter shows {int(actual_units_to_compare)} units. You have a {leak_units}-unit leak. Check for older, inefficient appliances or wiring faults.",
                "message_ta": f"உங்கள் உபகரணங்கள் ~{int(estimated_units)} யூனிட்கள் மட்டுமே பயன்படுத்த வேண்டும், ஆனால் உங்கள் மீட்டரில் {int(actual_units_to_compare)} யூனிட்கள் பதிவாகியுள்ளது. உங்களிடம் {leak_units} யூனிட் கசிவு உள்ளது. பழைய, திறனற்ற உபகரணங்கள் அல்லது வயரிங் குறைபாடுகளை சரிபார்க்கவும்.",
                "leak_units": leak_units
            })

        # -------------------------------------------------------------
        # 4. Feature 3 Card: Usage Velocity Pace Warning
        # -------------------------------------------------------------
        if projected_units > 500:
            cards.append({
                "id": "usage-velocity",
                "type": "VELOCITY_SPIKE",
                "severity": "HIGH",
                "border_color": "RED",
                "title": "📈 Fast Burn Rate Detected",
                "title_ta": "📈 அதிவேக மின் நுகர்வு கண்டறியப்பட்டது",
                "message": f"You have used {int(current_units)} units in just {days_passed} days. At this pace, you will finish the cycle at {projected_units} units and lose your tier-1 subsidy.",
                "message_ta": f"நீங்கள் வெறும் {days_passed} நாட்களில் {int(current_units)} யூனிட்களைப் பயன்படுத்தியுள்ளீர்கள். இதே வேகத்தில் தொடர்ந்தால், சுழற்சி முடிவில் {projected_units} யூனிட்களை எட்டி உங்கள் முதல் அடுக்கு மானியத்தை இழப்பீர்கள்.",
                "projected_units": projected_units,
                "daily_velocity": daily_velocity
            })
        elif projected_units >= 420:
            cushion = 500 - projected_units
            cards.append({
                "id": "usage-velocity-cushion",
                "type": "VELOCITY_CUSHION",
                "severity": "MEDIUM",
                "border_color": "GOLD",
                "title": "⚡ Nearing 500-Unit Subsidy Cliff",
                "title_ta": "⚡ 500 யூனிட் மானிய வரம்பை நெருங்குகிறது",
                "message": f"You are burning {daily_velocity} units/day ({int(current_units)} kWh in {days_passed} days). You only have an {cushion}-unit cushion remaining before crossing the 500-unit tariff cliff.",
                "message_ta": f"நீங்கள் ஒரு நாளைக்கு {daily_velocity} யூனிட்கள் நுகர்கிறீர்கள் ({days_passed} நாட்களில் {int(current_units)} kWh). 500 யூனிட் கட்டண வரம்பைக் கடக்க இன்னும் வெறும் {cushion} யூனிட்கள் மட்டுமே எஞ்சியுள்ளன.",
                "projected_units": projected_units,
                "cushion": cushion
            })

        # -------------------------------------------------------------
        # 5. Feature 2: Seasonal \"Bill Shock\" Predictor
        # -------------------------------------------------------------
        is_approaching_summer = (current_month in [2, 3, 4, 5])
        summer_spike_pct = 40

        if historical_bills:
            summer_vals = [b.get('unitsConsumed', 0) for b in historical_bills if any(m in b.get('billingMonth', '').lower() for m in ['apr', 'may', 'jun', 'mar'])]
            winter_vals = [b.get('unitsConsumed', 0) for b in historical_bills if any(m in b.get('billingMonth', '').lower() for m in ['nov', 'dec', 'jan', 'feb'])]
            if summer_vals and winter_vals:
                avg_s = sum(summer_vals) / len(summer_vals)
                avg_w = sum(winter_vals) / len(winter_vals)
                if avg_w > 0:
                    calculated_jump = round(((avg_s - avg_w) / avg_w) * 100)
                    if calculated_jump >= 25:
                        summer_spike_pct = calculated_jump

        if is_approaching_summer and summer_spike_pct >= 30:
            cards.append({
                "id": "seasonal-bill-shock",
                "type": "SEASONAL_SPIKE",
                "severity": "MEDIUM",
                "border_color": "GOLD",
                "title": "☀️ Summer Spike Warning",
                "title_ta": "☀️ கோடைகால பயன்பாட்டு எச்சரிக்கை",
                "message": f"Based on your history, your usage typically jumps by {summer_spike_pct}% in April & May. Set your AC to 24°C instead of 18°C to avoid crossing the 500-unit penalty slab.",
                "message_ta": f"உங்கள் கடந்தகால வரலாற்றின் அடிப்படையில், ஏப்ரல் மற்றும் மே மாதங்களில் பயன்பாடு {summer_spike_pct}% அதிகரிக்கிறது. 500 யூனிட் அபராத கட்டண அடுக்கைத் தவிர்க்க உங்கள் ஏசியை 18°C-க்கு பதிலாக 24°C-ல் அமைக்கவும்.",
                "jump_percent": summer_spike_pct
            })

        return jsonify({
            "success": True,
            "health_score": health_score,
            "projected_units": projected_units,
            "daily_velocity": daily_velocity,
            "days_passed": days_passed,
            "current_units": current_units,
            "inbox_cards": cards
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 400

import asyncio
import edge_tts

async def generate_edge_tts(text, voice):
    communicate = edge_tts.Communicate(text, voice)
    data = b""
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            data += chunk["data"]
    return data

@app.route('/tts', methods=['GET', 'POST'])
def text_to_speech():
    """
    High-Definition Neural Female Voice Synthesis for Tamil & English
    Tamil Female: ta-IN-PallaviNeural
    English Female: en-IN-NeerjaNeural
    """
    try:
        if request.method == 'POST':
            data = request.json or {}
            text = data.get('text', '')
            lang = data.get('lang', 'ta')
        else:
            text = request.args.get('text', '')
            lang = request.args.get('lang', 'ta')

        if not text or not text.strip():
            return jsonify({"success": False, "message": "Text is required"}), 400

        # Strip markdown syntax and sanitize
        clean_text = text.replace('*', '').replace('#', '').replace('`', '').replace('~', '').strip()[:400]
        is_tamil = lang in ['ta', 'ta-IN', 'tamil']
        voice = 'ta-IN-PallaviNeural' if is_tamil else 'en-IN-NeerjaNeural'

        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            audio_bytes = loop.run_until_complete(generate_edge_tts(clean_text, voice))
            loop.close()
            return send_file(io.BytesIO(audio_bytes), mimetype='audio/mp3', as_attachment=False)
        except Exception as edge_err:
            print(f"[WARN] edge_tts failed, falling back to gTTS: {edge_err}")
            tts = gTTS(text=clean_text, lang='ta' if is_tamil else 'en', slow=False)
            fp = io.BytesIO()
            tts.write_to_fp(fp)
            fp.seek(0)
            return send_file(fp, mimetype='audio/mp3', as_attachment=False)

    except Exception as e:
        print(f"[ERROR] TTS Generation failed: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

if __name__ == '__main__':
    # Run on port 5001 to avoid conflicting with Node.js on 5000
    app.run(port=5001, debug=True)
