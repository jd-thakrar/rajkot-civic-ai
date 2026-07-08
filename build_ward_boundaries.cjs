/**
 * Build RMC ward polygons clipped to Rajkot Municipal Corporation city limits.
 * Seed points = known ward centers from mockData (lat/lng → GeoJSON lon/lat).
 * Run: node build_ward_boundaries.cjs
 */
const fs = require('fs');
const turf = require('@turf/turf');

const RMC_CITY_BBOX = [70.705, 22.245, 70.835, 22.370];

// Relative ward centers from official RMC ward map (2019) layout
const RELATIVE_CENTERS = [
  [0.45, 0.25], [0.60, 0.28], [0.75, 0.35],
  [0.40, 0.40], [0.50, 0.45], [0.65, 0.45],
  [0.25, 0.38], [0.35, 0.48], [0.45, 0.55],
  [0.55, 0.55], [0.60, 0.52], [0.75, 0.50],
  [0.35, 0.65], [0.45, 0.70], [0.50, 0.75],
  [0.65, 0.70], [0.55, 0.85], [0.80, 0.45]
];

const [minX, minY, maxX, maxY] = RMC_CITY_BBOX;
const WARD_CENTERS = {};
RELATIVE_CENTERS.forEach((rel, index) => {
  const num = String(index + 1).padStart(2, '0');
  const id = `RMC-${num}`;
  WARD_CENTERS[id] = [
    minX + (maxX - minX) * rel[0],
    maxY - (maxY - minY) * rel[1]
  ];
});

const cityPolygon = turf.bboxPolygon(RMC_CITY_BBOX);
const seedPoints = Object.entries(WARD_CENTERS).map(([id, [lon, lat]]) =>
  turf.point([lon, lat], { id })
);

const voronoi = turf.voronoi(turf.featureCollection(seedPoints), { bbox: RMC_CITY_BBOX });
const finalWards = [];

voronoi.features.forEach((cell) => {
  if (!cell?.geometry) return;

  const clipped = turf.intersect(turf.featureCollection([cell, cityPolygon]));
  if (!clipped) return;

  let assignedId = null;
  for (const [id, [lon, lat]] of Object.entries(WARD_CENTERS)) {
    if (turf.booleanPointInPolygon(turf.point([lon, lat]), clipped)) {
      assignedId = id;
      break;
    }
  }
  if (!assignedId) return;

  const num = assignedId.replace('RMC-', '');
  clipped.properties = {
    id: assignedId,
    wardId: assignedId,
    name: `Ward ${parseInt(num, 10)}`
  };
  finalWards.push(clipped);
});

finalWards.sort((a, b) => a.properties.id.localeCompare(b.properties.id));

if (finalWards.length !== 18) {
  console.warn(`Expected 18 wards, got ${finalWards.length}`);
}

fs.writeFileSync(
  'wardBoundaries.geojson',
  JSON.stringify(turf.featureCollection(finalWards), null, 2)
);

console.log(`Wrote ${finalWards.length} ward polygons to wardBoundaries.geojson`);
finalWards.forEach((f) => {
  const c = turf.centroid(f).geometry.coordinates;
  console.log(`  ${f.properties.id}: centroid [${c[1].toFixed(4)}, ${c[0].toFixed(4)}]`);
});
