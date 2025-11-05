const map = L.map('map').setView([46.6, -112.0], 13); // ✅ Zoom level fixed

// 🗺️ USGS Topo Tiles
L.tileLayer('https://basemap.nationalmap.gov/ArcGIS/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: 16,
  attribution: 'Map data © USGS'
}).addTo(map);

// 🧭 BLM PLSS Section Lines
L.tileLayer.wms('https://gis.blm.gov/arcgis/services/Cadastral/BLM_Natl_PLSS_CadNSDI/MapServer/WMSServer', {
  layers: '2', // Layer 2 = PLSS Sections
  format: 'image/png',
  transparent: true,
  attribution: 'BLM National PLSS'
}).addTo(map);

// 📍 GPS Tracking — No Auto-Zoom
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
        radius: 1,
        color: '#007bff',
        fillColor: '#007bff',
        fillOpacity: 1
      }).addTo(map);
    }

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

  // 🧼 Clear previous offset visuals
  map.eachLayer(layer => {
    if (layer.options && (layer.options.title === "Declination Offset" || layer.options.color === "orange" || layer.options.dashArray === '4,4')) {
      map.removeLayer(layer);
    }
  });

  // 📥 Get form values
  let distance = parseFloat(document.getElementById('distance').value);
  const declination = parseFloat(document.getElementById('declination').value);
  const direction = document.getElementById('direction').value;
  const error = parseInt(document.getElementById('chaining-error').value);

  // 🧮 Convert chains to feet if needed
  if (distance < 200) {
    distance *= 66;
  }

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

  // 📍 Declination Offset Pin
  L.marker([offsetLat, offsetLng], {
    title: "Declination Offset",
    icon: L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41]
    })
  }).addTo(map).bindPopup(`Offset: ${lateralOffset.toFixed(2)} ft ${offsetDirection}`).openPopup();

  // 📏 Chaining Error Zone around GPS location
  let zoneBounds;
  if (direction === 'north-south') {
    zoneBounds = [
      [currentLat - feetToDegreesLat(error), currentLng - 0.00005],
      [currentLat + feetToDegreesLat(error), currentLng + 0.00005]
    ];
  } else {
    zoneBounds = [
      [currentLat - 0.00005, currentLng - feetToDegreesLng(error, currentLat)],
      [currentLat + 0.00005, currentLng + feetToDegreesLng(error, currentLat)]
    ];
  }

  L.rectangle(zoneBounds, {
    color: 'orange',
    weight: 2,
    dashArray: '5,5',
    fillOpacity: 0.1
  }).addTo(map);

  // 🔄 Line from GPS to Offset
  L.polyline([
    [currentLat, currentLng],
    [offsetLat, offsetLng]
  ], {
    color: 'blue',
    weight: 1,
    dashArray: '4,4'
  }).addTo(map);

  // 📐 Distance to Offset
  const dx = (offsetLng - currentLng) * 288200 * Math.cos(currentLat * Math.PI / 180);
  const dy = (offsetLat - currentLat) * 364000;
  const walkDistance = Math.sqrt(dx * dx + dy * dy);

  // 🧠 Output Summary
  const output = `
    <p><strong>Declination Offset:</strong> ${lateralOffset.toFixed(2)} ft (${offsetDirection})</p>
    <p><strong>Offset Location:</strong> Lat ${offsetLat.toFixed(8)}, Lng ${offsetLng.toFixed(8)}</p>
    <p><strong>Chaining Error Zone:</strong> ±${error} ft around GPS location (${direction})</p>
    <p><strong>Distance to Offset:</strong> ${walkDistance.toFixed(1)} ft</p>
  `;
  document.getElementById('offset-output').innerHTML = output;
  document.getElementById('results-section').style.display = 'block';
});
