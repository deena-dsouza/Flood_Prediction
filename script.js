const indianCities = [
  "mangalore","Udupi","Chennai", "Mumbai", "Delhi", "Bangalore", "Kolkata", "Hyderabad", "Ahmedabad",
  "Pune", "Jaipur", "Lucknow", "Kanpur", "Nagpur", "Indore", "Bhopal", "Patna",
  "Thiruvananthapuram", "Srinagar", "Guwahati", "Udupi", "Coimbatore", "Madurai",
  "Vijayawada", "Visakhapatnam", "Ranchi", "Jamshedpur", "Agra", "Varanasi", "Amritsar",
  "Shimla", "Manali", "Dehradun", "Panaji", "Raipur", "Surat", "Vadodara", "Rajkot","manipal"
  // Add more cities if needed
];

const select = document.getElementById('locationSelect');

indianCities.forEach(city => {
  const option = document.createElement('option');
  option.value = `${city},India`;
  option.textContent = `${city}`;
  select.appendChild(option);
});

function fetchSatelliteImage(predictionType) {
  const location = document.getElementById("locationSelect").value.trim();
  if (!location) {
    alert("Please enter a valid location.");
    return;
  }

  // UI updates
  document.getElementById("loading").classList.remove("hidden");
  document.getElementById("imageSection").classList.add("hidden");
  document.getElementById("result").classList.add("hidden");
  document.getElementById("error").classList.add("hidden");

  fetch("/get-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ location: location, predictionType: predictionType }),
  })
    .then((res) => {
      if (!res.ok) throw new Error("Failed to get satellite image");
      return res.json();
    })
    .then((data) => {
      console.log("Response from server:", data);

      if (data.error) {
        console.error("Error from server:", data.error);
        throw new Error(data.error);
      }

      const imgElement = document.getElementById("satelliteImage");
      const timestamp = new Date().getTime();
      imgElement.src = `${data.image_url}?v=${timestamp}`;
      imgElement.alt = `Satellite image of ${location}`;

      const weather = data.weather;
      const weatherInfo = `
        🌡 Temperature: ${weather.temperature}°C<br>
        💧 Humidity: ${weather.humidity}%<br>
        🌬 Wind Speed: ${weather.wind_speed} km/h<br>
        ⛆ Condition: ${weather.condition}<br>
        ☔ Rainfall: ${weather.rainfall} mm
      `;

      const floodRisk = calculateFloodRisk(weather);
      const landslideRisk = calculateLandslideRisk(weather);

      // Model-based prediction request
      fetch("/predict-weather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          temperature: weather.temperature,
          humidity: weather.humidity,
          wind_speed: weather.wind_speed,
          rainfall: weather.rainfall
        }),
      })
        .then((res) => {
          if (!res.ok) throw new Error("Prediction failed");
          return res.json();
        })
        .then((predictionData) => {
          const riskLevel = predictionData.risk_level;
          const confidence = predictionData.confidence;

          document.getElementById("predictionText").innerHTML = `
            <strong>Location:</strong> ${location} (Lat: ${data.coordinates.lat.toFixed(4)}, Lon: ${data.coordinates.lon.toFixed(4)})<br><br>
            <strong>Weather Data:</strong><br>${weatherInfo}<br>
            <strong>Flood Risk:</strong> ${floodRisk}<br>
            <strong>Landslide Risk:</strong> ${landslideRisk}<br>
          `;

          document.getElementById("loading").classList.add("hidden");
          document.getElementById("imageSection").classList.remove("hidden");
          document.getElementById("result").classList.remove("hidden");
        })
        .catch((err) => {
          console.error("Prediction Error:", err);
          document.getElementById("loading").classList.add("hidden");
          document.getElementById("error").textContent = `Prediction Error: ${err.message}`;
          document.getElementById("error").classList.remove("hidden");
        });
    })
    .catch((err) => {
      console.error("Error:", err);
      document.getElementById("loading").classList.add("hidden");
      document.getElementById("error").textContent = `Error: ${err.message}`;
      document.getElementById("error").classList.remove("hidden");
    });
}

function calculateFloodRisk(weather) {
  let riskScore = 0;
  if (weather.rainfall > 50) riskScore += 3;
  else if (weather.rainfall > 30) riskScore += 2;
  else if (weather.rainfall > 10) riskScore += 1;

  if (weather.humidity > 80) riskScore += 2;
  else if (weather.humidity > 70) riskScore += 1;

  if (riskScore >= 4) return "High 🚨";
  if (riskScore >= 2) return "Medium ⚠️";
  return "Low ✅";
}

function calculateLandslideRisk(weather) {
  let riskScore = 0;
  if (weather.rainfall > 40) riskScore += 3;
  else if (weather.rainfall > 25) riskScore += 2;
  else if (weather.rainfall > 10) riskScore += 1;

  const rainfall_last_3days = weather.rainfall * 3;

  if (rainfall_last_3days > 60) riskScore += 2;
  else if (rainfall_last_3days > 30) riskScore += 1;

  if (riskScore >= 4) return "High 🚨";
  if (riskScore >= 2) return "Medium ⚠️";
  return "Low ✅";
}