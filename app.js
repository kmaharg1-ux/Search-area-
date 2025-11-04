const map = L.map('map').setView([46.6, -112.0], 10);

// USGS Topo Tiles
L.tileLayer('https://basemap.nationalmap.gov/ArcGIS/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: 16,
  attribution: 'Map data © USGS'
}).addTo(map);

// Montana PLSS WMS Layer
L.tileLayer.wms('https://gisservicemt.gov/arcgis/services/MSDI_Framework/PLSS/MapServer/WMSServer', {
  layers: '0',
  format: 'image/png',
  transparent: true,
  attribution: 'Montana State Library PLSS'
}).addTo(map);

// Declination Offset Logic
document.getElementById('survey-form').addEventListener('submit', function (e) {
  e.preventDefault();

  const distance = parseFloat(document.getElementById('distance').value);
  const declination = parseFloat(document.getElementById('declination').value);
  const direction = document.getElementById('direction').value;
  const error = parseInt(document.getElementById('chaining-error').value);

  const lateralOffset = Math.tan(declination * Math.PI / 180) * distance;
  const offsetDirection = direction === 'north-south' ? 'east-west' : 'north-south';

  const output = `
    <p><strong>Lateral Offset:</strong> ${lateralOffset.toFixed(2)} ft (${offsetDirection})</p>
    <p><strong>Chaining Error Zone:</strong> ±${error} ft (${direction})</p>
  `;

  document.getElementById('offset-output').innerHTML = output;
});
