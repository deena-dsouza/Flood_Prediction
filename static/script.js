// function fetchSatelliteImage(predictionType) {
//   const location = document.getElementById("locationInput").value.trim();
//   if (!location) {
//     alert("Please enter a valid location.");
//     return;
//   }
  
//   // UI updates
//   document.getElementById("loading").classList.remove("hidden");
//   document.getElementById("imageSection").classList.add("hidden");
//   document.getElementById("result").classList.add("hidden");
//   document.getElementById("error").classList.add("hidden");
  
//   fetch("/get-image", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ location: location, predictionType: predictionType }),
//   })
//     .then((res) => {
//       if (!res.ok) throw new Error("Failed to get satellite image");
//       return res.json();
//     })
//     .then((data) => {
//       if (data.error) {
//         throw new Error(data.error);
//       }

//       // Update satellite image with a cache-busting parameter
//       const imgElement = document.getElementById("satelliteImage");
//       const timestamp = new Date().getTime();
//       imgElement.src = `${data.image_url}?v=${timestamp}`;
//       imgElement.alt = `Satellite image of ${location}`;

//       // Update weather information
//       const weather = data.weather;
//       const weatherInfo = `
//         🌡 Temperature: ${weather.temperature}°C<br>
//         💧 Humidity: ${weather.humidity}%<br>
//         🌬 Wind Speed: ${weather.wind_speed} km/h<br>
//         🌦 Condition: ${weather.condition}<br>
//         🌧 Rainfall: ${weather.rainfall} mm
//       `;

//       // Simple risk assessment based on weather
//       const floodRisk = calculateFloodRisk(weather);
//       const landslideRisk = calculateLandslideRisk(weather);

//       document.getElementById("predictionText").innerHTML = `
//         <strong>Location:</strong> ${location} (Lat: ${data.coordinates.lat.toFixed(4)}, Lon: ${data.coordinates.lon.toFixed(4)})<br><br>
//         <strong>Weather Data:</strong><br>${weatherInfo}<br>
//         <strong>Flood Risk:</strong> ${floodRisk}<br>
//         <strong>Landslide Risk:</strong> ${landslideRisk}<br>
//       `;

//       // Update UI
//       document.getElementById("loading").classList.add("hidden");
//       document.getElementById("imageSection").classList.remove("hidden");
//       document.getElementById("result").classList.remove("hidden");
//     })
//     .catch((err) => {
//       console.error("Error:", err);
//       document.getElementById("loading").classList.add("hidden");
//       document.getElementById("error").textContent = `Error: ${err.message}`;
//       document.getElementById("error").classList.remove("hidden");
//     });
// }

// function calculateFloodRisk(weather) {
//   // Enhanced flood risk calculation
//   let riskScore = 0;
  
//   // Rainfall contributes most to flood risk
//   if (weather.rainfall > 50) riskScore += 3;
//   else if (weather.rainfall > 30) riskScore += 2;
//   else if (weather.rainfall > 10) riskScore += 1;
  
//   // High humidity also contributes
//   if (weather.humidity > 80) riskScore += 2;
//   else if (weather.humidity > 70) riskScore += 1;
  
//   // Determine risk level
//   if (riskScore >= 4) return "High";
//   if (riskScore >= 2) return "Medium";
//   return "Low";
// }

// function calculateLandslideRisk(weather) {
//   // Enhanced landslide risk calculation
//   let riskScore = 0;
  
//   // Heavy rainfall is primary factor
//   if (weather.rainfall > 40) riskScore += 3;
//   else if (weather.rainfall > 25) riskScore += 2;
//   else if (weather.rainfall > 10) riskScore += 1;
  
//   // Soil saturation (approximated by recent rainfall)
//   if (weather.rainfall_last_3days > 60) riskScore += 2;
//   else if (weather.rainfall_last_3days > 30) riskScore += 1;
  
//   // Determine risk level
//   if (riskScore >= 4) return "High";
//   if (riskScore >= 2) return "Medium";
//   return "Low";
// }
function fetchSatelliteImage(predictionType) {
  const location = document.getElementById("locationInput").value.trim();
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
      console.log("Response from server:", data);  // Log the response from the server for debugging

      if (data.error) {
        console.error('Error from server:', data.error);  // Log error from server
        throw new Error(data.error);
      }

      // Update satellite image with a cache-busting parameter
      const imgElement = document.getElementById("satelliteImage");
      const timestamp = new Date().getTime();
      imgElement.src = `${data.image_url}?v=${timestamp}`;
      imgElement.alt = `Satellite image of ${location}`;

      // Update weather information
      const weather = data.weather;
      const weatherInfo = `
        🌡 Temperature: ${weather.temperature}°C<br>
        💧 Humidity: ${weather.humidity}%<br>
        🌬 Wind Speed: ${weather.wind_speed} km/h<br>
        🌦 Condition: ${weather.condition}<br>
        🌧 Rainfall: ${weather.rainfall} mm
      `;

      // Simple risk assessment based on weather
      const floodRisk = calculateFloodRisk(weather);
      const landslideRisk = calculateLandslideRisk(weather);

      document.getElementById("predictionText").innerHTML = `
        <strong>Location:</strong> ${location} (Lat: ${data.coordinates.lat.toFixed(4)}, Lon: ${data.coordinates.lon.toFixed(4)})<br><br>
        <strong>Weather Data:</strong><br>${weatherInfo}<br>
        <strong>Flood Risk:</strong> ${floodRisk}<br>
        <strong>Landslide Risk:</strong> ${landslideRisk}<br>
      `;

      // Update UI
      document.getElementById("loading").classList.add("hidden");
      document.getElementById("imageSection").classList.remove("hidden");
      document.getElementById("result").classList.remove("hidden");
    })
    .catch((err) => {
      console.error("Error:", err);
      document.getElementById("loading").classList.add("hidden");
      document.getElementById("error").textContent = `Error: ${err.message}`;
      document.getElementById("error").classList.remove("hidden");
    });
}

function calculateFloodRisk(weather) {
  // Enhanced flood risk calculation
  let riskScore = 0;
  
  // Rainfall contributes most to flood risk
  if (weather.rainfall > 50) riskScore += 3;
  else if (weather.rainfall > 30) riskScore += 2;
  else if (weather.rainfall > 10) riskScore += 1;
  
  // High humidity also contributes
  if (weather.humidity > 80) riskScore += 2;
  else if (weather.humidity > 70) riskScore += 1;
  
  // Determine risk level
  if (riskScore >= 4) return "High 🚨";
  if (riskScore >= 2) return "Medium ⚠️";
  return "Low ✅";
}

function calculateLandslideRisk(weather) {
  // Enhanced landslide risk calculation
  let riskScore = 0;
  
  // Heavy rainfall is primary factor
  if (weather.rainfall > 40) riskScore += 3;
  else if (weather.rainfall > 25) riskScore += 2;
  else if (weather.rainfall > 10) riskScore += 1;
  
  // For demonstration, we'll assume rainfall_last_3days exists
  // In real implementation, you'd need to get this data from your weather API
  const rainfall_last_3days = weather.rainfall * 3; // Temporary approximation
  
  // Soil saturation (approximated by recent rainfall)
  if (rainfall_last_3days > 60) riskScore += 2;
  else if (rainfall_last_3days > 30) riskScore += 1;
  
  // Determine risk level
  if (riskScore >= 4) return "High 🚨";
  if (riskScore >= 2) return "Medium ⚠️";
  return "Low ✅";
}