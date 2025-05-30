from flask import Flask, request, jsonify, render_template, send_from_directory
from datetime import datetime, timedelta
import requests
import os
import uuid
import logging
import joblib
import pandas as pd

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration - replace these with your actual credentials
CLIENT_ID = "243dc1b8-cbaa-4399-ab08-fc08be85c237"
CLIENT_SECRET = "d8VJFcGQBHWUso5GiIHQJzgNBXCz5mdK"
WEATHER_API_KEY = "c8a009cfae354c5d9ad130006251004"
SENTINEL_HUB_API_URL = "https://services.sentinel-hub.com/api/v1/process"
GEOCODING_URL = "https://nominatim.openstreetmap.org/search"

# Load the trained model
MODEL_PATH = "models/xgb_model.pkl"
model = joblib.load(MODEL_PATH)

# Ensure static directory exists
os.makedirs("static/satellite_images", exist_ok=True)

def get_access_token():
    """Get OAuth token from Sentinel Hub"""
    url = "https://services.sentinel-hub.com/oauth/token"
    data = {
        "grant_type": "client_credentials",
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET
    }
    try:
        response = requests.post(url, data=data, timeout=10)
        response.raise_for_status()
        return response.json()["access_token"]
    except Exception as e:
        logger.error(f"Token fetch error: {str(e)}")
        raise

def get_coords(location):
    """Get coordinates from location name using OpenStreetMap"""
    params = {
        "q": location,
        "format": "json",
        "limit": 1,
        "countrycodes": "in",  # Prioritize Indian locations
        "addressdetails": 1
    }
    headers = {"User-Agent": "DisasterVision/1.0"}

    try:
        response = requests.get(GEOCODING_URL, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()

        if data:
            return float(data[0]["lat"]), float(data[0]["lon"])
        return None, None
    except requests.RequestException as e:
        logger.error(f"Geocoding error for {location}: {str(e)}")
        return None, None

def get_weather_data(lat, lon):
    """Get weather data from WeatherAPI"""
    url = f"http://api.weatherapi.com/v1/current.json?key={WEATHER_API_KEY}&q={lat},{lon}&aqi=no"

    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
        current = data["current"]

        return {
            "temperature": current["temp_c"],
            "humidity": current["humidity"],
            "wind_speed": current["wind_kph"],
            "condition": current["condition"]["text"],
            "rainfall": current.get("precip_mm", 0.0)
        }
    except requests.RequestException as e:
        logger.error(f"Weather API error for {lat},{lon}: {str(e)}")
        return None

def get_satellite_image(token, bbox, from_date, to_date):
    """Fetch Sentinel-1 SAR image from Sentinel Hub"""
    payload = {
        "input": {
            "bounds": {
                "bbox": bbox,
                "properties": {
                    "crs": "http://www.opengis.net/def/crs/EPSG/0/4326"
                }
            },
            "data": [{
                "type": "S1GRD",
                "dataFilter": {
                    "timeRange": {
                        "from": from_date,
                        "to": to_date
                    }
                }
            }]
        },
        "output": {
            "width": 512,
            "height": 512,
            "responses": [{
                "identifier": "default",
                "format": {"type": "image/png"}
            }]
        },
        "evalscript": """
        //VERSION=3
        function setup() {
            return {
                input: ["VV"],
                output: { bands: 3 }
            };
        }

        function evaluatePixel(sample) {
            let val = sample.VV * 2.5;
            return [val, val, val];
        }
        """
    }

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "image/png"
    }

    try:
        import json
        logger.info("Sentinel Hub payload:\n" + json.dumps(payload, indent=2))

        response = requests.post(
            SENTINEL_HUB_API_URL,
            json=payload,
            headers=headers,
            timeout=30
        )
        response.raise_for_status()
        return response.content

    except requests.RequestException as e:
        logger.error(f"Sentinel Hub API error: {str(e)}")
        if e.response is not None:
            logger.error(f"API response text: {e.response.text}")
        raise

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/static/satellite_images/<filename>")
def serve_image(filename):
    return send_from_directory("static/satellite_images", filename)

@app.route("/get-image", methods=["POST"])
def get_image():
    try:
        location = request.json.get("location", "").strip()
        if not location:
            return jsonify({"error": "Location is required"}), 400

        logger.info(f"Processing request for location: {location}")

        lat, lon = get_coords(location)
        if not lat or not lon:
            return jsonify({"error": "Could not geocode location. Please try a more specific Indian location."}), 400

        logger.info(f"Coordinates found: {lat}, {lon}")

        token = get_access_token()

        to_date = datetime.utcnow()
        from_date = to_date - timedelta(days=60)
        from_iso = from_date.strftime('%Y-%m-%dT%H:%M:%SZ')
        to_iso = to_date.strftime('%Y-%m-%dT%H:%M:%SZ')

        bbox = [lon - 0.05, lat - 0.05, lon + 0.05, lat + 0.05]
        logger.info(f"Bounding box: {bbox}")

        image_data = get_satellite_image(token, bbox, from_iso, to_iso)

        image_filename = f"{uuid.uuid4().hex}.png"
        image_path = os.path.join("static/satellite_images", image_filename)

        with open(image_path, "wb") as f:
            f.write(image_data)

        weather_data = get_weather_data(lat, lon)

        return jsonify({
            "image_url": f"/static/satellite_images/{image_filename}",
            "weather": weather_data,
            "coordinates": {"lat": lat, "lon": lon},
            "message": "Successfully fetched satellite data"
        })

    except requests.RequestException as e:
        logger.error(f"API Error: {str(e)}")
        return jsonify({
            "error": "Failed to fetch satellite data",
            "details": str(e),
            "solution": "Please try a different location or try again later"
        }), 500
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        return jsonify({
            "error": "Internal server error",
            "details": str(e)
        }), 500

@app.route("/predict-weather", methods=["POST"])
def predict_flood_risk():
    try:
        data = request.json
        print("Received data:", data)

        features = {
            "Rainfall (mm)": data.get("rainfall", 50),
            "Temperature (°C)": data.get("temperature", 30),
            "Humidity (%)": data.get("humidity", 70),
            "Wind Speed (km/h)": data.get("wind_speed", 10)
        }

        df_input = pd.DataFrame([features])
        print("DataFrame columns:", df_input.columns.tolist())
        print("DataFrame values:", df_input.values)

        prediction = model.predict(df_input)[0]
        proba = model.predict_proba(df_input)[0].max()

        risk_label = "High" if prediction == 1 else "Low"

        return jsonify({
            "prediction": int(prediction),
            "risk_level": risk_label,
            "confidence": float(round(proba * 100, 2))
           })


    except Exception as e:
        logger.error(f"Prediction error: {str(e)}", exc_info=True)
        return jsonify({"error": "Prediction failed"}), 500

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000)