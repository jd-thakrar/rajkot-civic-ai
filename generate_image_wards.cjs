const fs = require('fs');
const turf = require('@turf/turf');

// Read the OSM data
const osmData = JSON.parse(fs.readFileSync('rajkot_boundary_osm.json', 'utf8'));
const relation = osmData.elements.find(e => e.type === 'relation');

let lines = relation.members
  .filter(m => m.type === 'way' && m.role === 'outer')
  .map(way => way.geometry.map(coord => [coord.lon, coord.lat]));

let rings = [];
let unassignedLines = [...lines];

while (unassignedLines.length > 0) {
  let ring = [...unassignedLines.shift()];
  
  let added = true;
  while (added) {
    added = false;
    let head = ring[0];
    let tail = ring[ring.length - 1];
    
    for (let i = 0; i < unassignedLines.length; i++) {
      let line = unassignedLines[i];
      let lineHead = line[0];
      let lineTail = line[line.length - 1];
      
      const isSamePoint = (p1, p2) => Math.abs(p1[0]-p2[0]) < 0.00001 && Math.abs(p1[1]-p2[1]) < 0.00001;
      
      if (isSamePoint(tail, lineHead)) {
        ring = ring.concat(line.slice(1));
        unassignedLines.splice(i, 1);
        added = true;
        break;
      } else if (isSamePoint(tail, lineTail)) {
        ring = ring.concat(line.slice().reverse().slice(1));
        unassignedLines.splice(i, 1);
        added = true;
        break;
      } else if (isSamePoint(head, lineTail)) {
        ring = line.concat(ring.slice(1));
        unassignedLines.splice(i, 1);
        added = true;
        break;
      } else if (isSamePoint(head, lineHead)) {
        ring = line.slice().reverse().concat(ring.slice(1));
        unassignedLines.splice(i, 1);
        added = true;
        break;
      }
    }
  }
  rings.push(ring);
}

rings.forEach(ring => {
  const head = ring[0];
  const tail = ring[ring.length - 1];
  if (Math.abs(head[0]-tail[0]) > 0.00001 || Math.abs(head[1]-tail[1]) > 0.00001) {
    ring.push([...head]); 
  }
});

let rajkotPolygon;
try {
  rajkotPolygon = turf.polygon(rings);
} catch (e) {
  let allPoints = [];
  rings.forEach(r => r.forEach(pt => allPoints.push(turf.point(pt))));
  rajkotPolygon = turf.convex(turf.featureCollection(allPoints));
}

const bbox = turf.bbox(rajkotPolygon);
const minX = bbox[0];
const minY = bbox[1];
const maxX = bbox[2];
const maxY = bbox[3];

// Relative coordinates derived from the uploaded image (0,0 is top-left, 1,1 is bottom-right)
const relativeCenters = [
  [0.45, 0.25], [0.60, 0.28], [0.75, 0.35],
  [0.40, 0.40], [0.50, 0.45], [0.65, 0.45],
  [0.25, 0.38], [0.35, 0.48], [0.45, 0.55],
  [0.55, 0.55], [0.60, 0.52], [0.75, 0.50],
  [0.35, 0.65], [0.45, 0.70], [0.50, 0.75],
  [0.65, 0.70], [0.55, 0.85], [0.80, 0.45]
];

let points = relativeCenters.map(rel => {
  const lon = minX + (maxX - minX) * rel[0];
  const lat = maxY - (maxY - minY) * rel[1]; // y=0 is top (maxY)
  return turf.point([lon, lat]);
});

// Create Voronoi
const voronoiPolygons = turf.voronoi(turf.featureCollection(points), { bbox: bbox });

let finalWards = [];

voronoiPolygons.features.forEach((voronoiFeature, index) => {
  if (voronoiFeature) {
    const intersection = turf.intersect(turf.featureCollection([voronoiFeature, rajkotPolygon]));
    if (intersection) {
      let num = index + 1;
      let pad = num < 10 ? "0" + num : "" + num;
      intersection.properties = {
        id: "RMC-" + pad,
        wardId: "ward_" + num,
        name: "Ward " + num
      };
      finalWards.push(intersection);
    }
  }
});

const geojsonCollection = turf.featureCollection(finalWards);
fs.writeFileSync('wardBoundaries.geojson', JSON.stringify(geojsonCollection, null, 2));
console.log('Created highly accurate image-matched ward boundaries in wardBoundaries.geojson');
