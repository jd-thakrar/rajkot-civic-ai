/**
 * Fetch official RMC ward boundaries from gis.rmc.gov.in WFS
 * and write wardBoundaries.geojson (WGS84 / EPSG:4326).
 * Run: node fetch_rmc_ward_boundaries.cjs
 */
const fs = require('fs');

function mercatorToWgs84(x, y) {
  const lon = (x / 20037508.34) * 180;
  let lat = (y / 20037508.34) * 180;
  lat = (180 / Math.PI) * (2 * Math.atan(Math.exp((lat * Math.PI) / 180)) - Math.PI / 2);
  return [lon, lat];
}

function convertCoords(coords) {
  if (typeof coords[0] === 'number') {
    return mercatorToWgs84(coords[0], coords[1]);
  }
  return coords.map(convertCoords);
}

function convertGeometry(geometry) {
  return {
    type: geometry.type,
    coordinates: convertCoords(geometry.coordinates)
  };
}

function llTo3857(lon, lat) {
  const x = (lon * 20037508.34) / 180;
  const y =
    Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) /
    (Math.PI / 180) *
    (20037508.34 / 180);
  return [x, y];
}

async function fetchWardBoundaries() {
  const sw = llTo3857(70.705, 22.245);
  const ne = llTo3857(70.835, 22.370);
  const bbox = [sw[0], sw[1], ne[0], ne[1]].join(',');

  const params = new URLSearchParams({
    service: 'WFS',
    version: '1.1.0',
    request: 'GetFeature',
    typeName: 'anygis:Rajkot_City_GIS.R_WARD_BOUNDARY',
    outputFormat: 'application/json',
    bbox,
    srsName: 'EPSG:3857'
  });

  const url = `https://gis.rmc.gov.in/rajkot_map_services/api/wfs/1.1.0/map?${params}`;
  console.log('Fetching official RMC ward boundaries…');

  const res = await fetch(url, { headers: { 'User-Agent': 'RMC-Pulse/1.0' } });
  const text = await res.text();
  if (!text.startsWith('{')) {
    throw new Error(`WFS error: ${text.slice(0, 300)}`);
  }

  const raw = JSON.parse(text);
  if (!raw.features?.length) throw new Error('No ward features returned from RMC GIS');

  const features = raw.features.map((feature) => {
    const p = feature.properties || {};
    const wardNo = Number(p.WARD_NO);
    const id = `RMC-${String(wardNo).padStart(2, '0')}`;

    return {
      type: 'Feature',
      properties: {
        id,
        wardId: id,
        wardNo,
        name: p.WARD_NAME || `Ward ${wardNo}`,
        zone: p.ZONE_NAME || '',
        zoneId: p.ZONE_ID,
        areaSqKm: p.AREA,
        corporator1: p.CORP1_NAME,
        corporator2: p.CORP2_NAME,
        corporator3: p.CORP3_NAME,
        corporator4: p.CORP4_NAME,
        source: 'RMC GIS WFS — R_WARD_BOUNDARY'
      },
      geometry: convertGeometry(feature.geometry)
    };
  });

  features.sort((a, b) => a.properties.wardNo - b.properties.wardNo);

  const collection = { type: 'FeatureCollection', features };
  fs.writeFileSync('data/wardBoundaries.geojson', JSON.stringify(collection, null, 2));

  console.log(`Saved ${features.length} official ward polygons to data/wardBoundaries.geojson`);
  features.forEach((f) => {
    const ring = f.geometry.coordinates[0];
    let sx = 0;
    let sy = 0;
    ring.forEach(([lon, lat]) => {
      sx += lon;
      sy += lat;
    });
    console.log(
      `  ${f.properties.id} (${f.properties.zone}): ${f.properties.name} — ${ring.length} boundary points`
    );
  });
}

fetchWardBoundaries().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
