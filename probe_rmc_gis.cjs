async function probe(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'RMC-Pulse/1.0' } });
    const ct = res.headers.get('content-type') || '';
    const text = await res.text();
    const preview = text.slice(0, 120).replace(/\s+/g, ' ');
    console.log(`${res.status} ${ct.split(';')[0]} ${url}`);
    if (text.includes('coordinates') || text.includes('Polygon') || text.includes('features')) {
      console.log('  >>> GEOMETRY DATA FOUND', preview);
    }
    return { status: res.status, ct, text };
  } catch (e) {
    console.log(`ERR ${url} -> ${e.message}`);
    return null;
  }
}

async function main() {
  const urls = [
    'https://gis.rmc.gov.in/rajkotcitygis/map/getwardboundary/1',
    'https://gis.rmc.gov.in/rajkotcitygis/map/getwardboundary?wardNo=1',
    'https://gis.rmc.gov.in/rajkotcitygis/map/getwardgeojson',
    'https://gis.rmc.gov.in/rajkotcitygis/map/getwardgeojson/1',
    'https://gis.rmc.gov.in/rajkotcitygis/map/getwarddetails/1',
    'https://gis.rmc.gov.in/rajkotcitygis/map/getwarddetails?wardNo=1',
    'https://gis.rmc.gov.in/rajkotcitygis/map/getareasbyward/1',
    'https://gis.rmc.gov.in/rajkotcitygis/map/getareasbyward?wardNo=1',
    'https://gis.rmc.gov.in/rajkot_map_services/api/wfs/1.1.0/map?service=WFS&version=1.1.0&request=GetCapabilities',
    'https://gis.rmc.gov.in/rajkot_map_services/api/wfs/1.1.0/map?service=WFS&version=1.1.0&request=GetFeature&typeName=Rajkot_City_GIS:13&outputFormat=application/json&srsName=EPSG:4326',
    'https://gis.rmc.gov.in/rajkot_map_services/api/wms/1.1.1/map?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetCapabilities',
  ];

  for (const url of urls) await probe(url);

  // Try POST endpoints from common Spring MVC patterns
  for (const wardNo of [1, 12]) {
    for (const path of ['getwardboundary', 'getwardgeometry', 'getwardpolygon', 'getareasbyward']) {
      const url = `https://gis.rmc.gov.in/rajkotcitygis/map/${path}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'RMC-Pulse/1.0' },
        body: JSON.stringify({ wardNo, fid: wardNo })
      }).catch(() => null);
      if (res) {
        const text = await res.text();
        console.log(`POST ${res.status} ${path} w${wardNo}: ${text.slice(0, 100).replace(/\s+/g, ' ')}`);
      }
    }
  }
}

main();
