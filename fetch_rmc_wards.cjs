const fs = require('fs');

async function fetchJson(url, label) {
  console.log(`Fetching ${label}: ${url}`);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'RMC-Pulse/1.0', Accept: 'application/json, */*' }
  });
  console.log(`  Status: ${res.status} ${res.headers.get('content-type')}`);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    console.log('  Non-JSON preview:', text.slice(0, 500));
    fs.writeFileSync(`${label.replace(/\W+/g, '_')}.txt`, text);
    return null;
  }
}

async function main() {
  const endpoints = [
    ['getwards', 'https://gis.rmc.gov.in/rajkotcitygis/map/getwards'],
    ['getownerdetails_wards', 'https://gis.rmc.gov.in/rajkotcitygis/map/getownerdetails/wards'],
    ['wfs_caps', 'https://gis.rmc.gov.in/rajkot_map_services/api/wfs?service=WFS&version=1.1.0&request=GetCapabilities'],
    ['wfs_ward_geojson', 'https://gis.rmc.gov.in/rajkot_map_services/api/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName=Rajkot_City_GIS:13&outputFormat=application/json&srsName=EPSG:4326'],
    ['wfs_ward_gml', 'https://gis.rmc.gov.in/rajkot_map_services/api/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName=Rajkot_City_GIS:13&outputFormat=GML2&srsName=EPSG:4326']
  ];

  for (const [label, url] of endpoints) {
    try {
      const data = await fetchJson(url, label);
      if (data) {
        fs.writeFileSync(`rmc_gis_${label}.json`, JSON.stringify(data, null, 2));
        if (data.features) console.log(`  Features: ${data.features.length}`);
        else if (Array.isArray(data)) console.log(`  Array length: ${data.length}`);
        else console.log(`  Keys: ${Object.keys(data).join(', ')}`);
      }
    } catch (err) {
      console.error(`  Error: ${err.message}`);
    }
  }
}

main();
