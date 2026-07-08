const fs = require('fs');

const path = 'e:\\vacation\\Build with AI\\wardBoundaries.geojson';
const geojson = JSON.parse(fs.readFileSync(path, 'utf8'));

geojson.features.forEach(f => {
  const oldId = f.properties.ward_id; // e.g., "ward_1"
  if (oldId && oldId.startsWith('ward_')) {
    const num = oldId.split('_')[1];
    const newId = `RMC-${num.padStart(2, '0')}`;
    f.properties.ward_id = newId;
  }
});

fs.writeFileSync(path, JSON.stringify(geojson, null, 2));
console.log('Successfully updated wardBoundaries.geojson IDs to RMC-XX format');
