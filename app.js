const map = L.map('map').setView([46.6, -112.0], 16);

// 🗺️ USGS Topo Tiles
L.tileLayer('https://basemap.nationalmap.gov/ArcGIS/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: 16,
  attribution: 'Map data © USGS'
}).addTo(map);

// 🧭 Montana PLSS WMS Layer
L.tileLayer.wms('https://gisservicemt.gov/arcgis/services/MSDI_Framework/PLSS/MapServer/WMSServer', {
  layers: '0',
  format: 'image/png',
  transparent: true,
  attribution: 'Montana State Library PLSS'
}).addTo(map);

// 📍 GPS Tracking with High Accuracy — No Auto-Zoom
let currentLat = null;
let currentLng = null;
let gpsMarker = null;

navigator.geolocation.watchPosition(
  function (position) {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;

    currentLat = lat;
    currentLng = lng;

    const latlng = L.latLng(lat, lng);

    if (gpsMarker) {
      gpsMarker.setLatLng(latlng);
    } else {
      gpsMarker = L.circleMarker(latlng, {
        radius: 8,
        color: '#007bff',
        fillColor: '#007bff',
        fillOpacity: 1
      }).addTo(map);
    }

    // ❌ No auto-zoom or auto-centering
    document.getElementById('gps-output').innerText =
      `Lat: ${lat.toFixed(8)}, Lng: ${lng.toFixed(8)}`;
  },
  function () {
    document.getElementById('gps-output').innerText = "Location access denied or unavailable.";
  },
  {
    enableHighAccuracy: true,
    maximumAge: 1000,
    timeout: 10000
  }
);

// 📐 Declination Offset + Chaining Error
document.getElementById('survey-form').addEventListener('submit', function (e) {
  e.preventDefault();

  if (currentLat === null || currentLng === null) {
    alert("Waiting for GPS fix...");
    return;
  }

  // 🧼 Clear previous offset layers
  map.eachLayer(layer => {
    if (layer.options && (layer.options.title === "Declination Offset" || layer.options.color === "orange")) {
      map.removeLayer(layer);
    }
  });

  // 📥 Get form values
  const distance = parseFloat(document.getElementById('distance').value);
  const declination = parseFloat(document.getElementById('declination').value);
  const direction = document.getElementById('direction').value;
  const error = parseInt(document.getElementById('chaining-error').value);

  const lateralOffset = Math.tan(declination * Math.PI / 180) * distance;
  const offsetDirection = direction === 'north-south' ? 'east-west' : 'north-south';

  // 🧮 Convert feet to degrees (approximate)
  const feetToDegreesLat = feet => feet / 364000;
  const feetToDegreesLng = (feet, lat) => feet / (Math.cos(lat * Math.PI / 180) * 288200);

  let offsetLat = currentLat;
  let offsetLng = currentLng;

  if (offsetDirection === 'east-west') {
    offsetLng += feetToDegreesLng(lateralOffset, currentLat);
  } else {
    offsetLat += feetToDegreesLat(lateralOffset);
  }

  // 📍 Offset Pin
  L.marker([offsetLat, offsetLng], {
    title: "Declination Offset",
    icon: L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41]
    })
  }).addTo(map).bindPopup(`Offset: ${lateralOffset.toFixed(2)} ft ${offsetDirection}`).openPopup();

  // 📏 Chaining Error Zone
  let zoneBounds;
  if (direction === 'north-south') {
    zoneBounds = [
      [currentLat - feetToDegreesLat(error), currentLng],
      [currentLat + feetToDegreesLat(error), currentLng]
    ];
  } else {
    zoneBounds = [
      [currentLat, currentLng - feetToDegreesLng(error, currentLat)],
      [currentLat, currentLng + feetToDegreesLng(error, currentLat)]
    ];
  }

  L.polyline(zoneBounds, { color: 'orange', weight: 2, dashArray: '5,5' }).addTo(map);

  // 🧠 Output Summary
  const output = `
    <p><strong>Lateral Offset:</strong> ${lateralOffset.toFixed(2)} ft (${offsetDirection})</p>
    <p><strong>Offset Location:</strong> Lat ${offsetLat.toFixed(8)}, Lng ${offsetLng.toFixed(8)}</p>
    <p><strong>Chaining Error Zone:</strong> ±${error} ft (${direction})</p>
  `;
  document.getElementById('offset-output').innerHTML = output;
  document.getElementById('results-section').style.display = 'block';
});
