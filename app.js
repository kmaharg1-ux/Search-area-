// app.js

const map = L.map('map').setView([46.8797, -110.3626], 13); // Default center (Montana)

L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
  maxZoom: 17,
  attribution: 'Map data © OpenTopoMap'
}).addTo(map);

let userMarker, radiusCircle, offsetMarker;
let watchId = null;

// Start GPS tracking when button is clicked
function startTracking() {
  document.getElementById("status").textContent = "Status: Waiting for GPS…";

  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
  }

  watchId = navigator.geolocation.watchPosition(
    pos => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      document.getElementById("status").textContent = `Status: Location locked at ${lat.toFixed(5)}, ${lng.toFixed(5)}`;

      if (!userMarker) {
        userMarker = L.marker([lat, lng]).addTo(map).bindPopup("You are here").openPopup();
        map.setView([lat, lng], 15);
      } else {
        userMarker.setLatLng([lat, lng]);
      }

      window.currentLocation = { lat, lng };
    },
    err => {
      document.getElementById("status").textContent = "Status: Error getting location";
      console.error(err);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 10000
    }
  );
}

// Calculate declination offset and draw radius + pin
function calculateOffset() {
  if (!window.currentLocation) {
    alert("Waiting for GPS fix...");
    return;
  }

  const distanceInput = parseFloat(document.getElementById("distance").value);
  const units = document.getElementById("units").value;
  const declinationDeg = parseFloat(document.getElementById("declination").value);
  const direction = document.getElementById("direction").value;

  let distanceFeet = distanceInput;
  if (units === "chains") distanceFeet *= 66;
  if (units === "miles") distanceFeet *= 5280;

  const declinationRad = declinationDeg * Math.PI / 180;
  const offsetFeet = distanceFeet * Math.tan(declinationRad);
  const offsetMeters = offsetFeet * 0.3048;

  const lat = window.currentLocation.lat;
  const lng = window.currentLocation.lng;

  let offsetLat = lat;
  let offsetLng = lng;

  if (direction === "NS") {
    const metersPerDegreeLng = 40075000 * Math.cos(lat * Math.PI / 180) / 360;
    offsetLng += offsetMeters / metersPerDegreeLng;
  } else if (direction === "EW") {
    offsetLat += offsetMeters / 111320;
  }

  if (radiusCircle) map.removeLayer(radiusCircle);
  radiusCircle = L.circle([lat, lng], {
    radius: distanceFeet * 0.3048,
    color: 'blue',
    fillOpacity: 0.1
  }).addTo(map);

  if (offsetMarker) map.removeLayer(offsetMarker);
  offsetMarker = L.marker([offsetLat, offsetLng])
    .addTo(map)
    .bindPopup("Offset due to declination")
    .openPopup();
}

// Toggle control panel visibility
function toggleControls() {
  const controls = document.querySelector('.controls');
  controls.classList.toggle('collapsed');

  const toggleBtn = document.getElementById('togglePanel');
  if (controls.classList.contains('collapsed')) {
    toggleBtn.textContent = "☰ Show Controls";
  } else {
    toggleBtn.textContent = "☰ Hide Controls";
  }
}
