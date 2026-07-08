const https = require('https');
const fs = require('fs');

// Try the main Overpass instance and also check the raw response
const query = `[out:json][timeout:60];
area["name"="Rajkot"]["place"="city"]->.rajkot;
relation["admin_level"~"9|10"](area.rajkot);
out geom;`;

const postData = 'data=' + encodeURIComponent(query);

const options = {
  hostname: 'overpass-api.de',
  path: '/api/interpreter',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Querying OpenStreetMap Overpass API (attempt 2)...');
const req = https.request(options, (res) => {
  console.log('HTTP Status:', res.statusCode);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Response length:', data.length);
    console.log('Response preview:', data.substring(0, 300));
    try {
      const parsed = JSON.parse(data);
      console.log('Elements found:', parsed.elements?.length);
      if (parsed.elements?.length > 0) {
        parsed.elements.forEach(el => {
          console.log(' ', el.type, el.id, JSON.stringify(el.tags));
        });
        fs.writeFileSync('osm_rajkot_wards.json', JSON.stringify(parsed, null, 2));
        console.log('\nSaved to osm_rajkot_wards.json');
      }
    } catch(e) {
      console.log('JSON parse failed. Raw HTML/error response:', data.substring(0, 1000));
    }
  });
});
req.on('error', e => console.error('Request error:', e.message));
req.write(postData);
req.end();
