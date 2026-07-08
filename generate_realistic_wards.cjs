const fs = require('fs');
const turf = require('@turf/turf');

// Read the OSM data
const osmData = JSON.parse(fs.readFileSync('rajkot_boundary_osm.json', 'utf8'));

// The relation should be the first element, or we find it
const relation = osmData.elements.find(e => e.type === 'relation');

if (!relation) {
  console.error("No relation found in OSM data.");
  process.exit(1);
}

// Assemble the coordinates for the polygon
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

// Ensure rings are closed
rings.forEach(ring => {
  const head = ring[0];
  const tail = ring[ring.length - 1];
  if (Math.abs(head[0]-tail[0]) > 0.00001 || Math.abs(head[1]-tail[1]) > 0.00001) {
    ring.push([...head]); // Close the ring
  }
});

let rajkotPolygon;
try {
  rajkotPolygon = turf.polygon(rings);
} catch (e) {
  console.log("Building polygon failed, creating convex hull of all points instead");
  let allPoints = [];
  rings.forEach(r => r.forEach(pt => allPoints.push(turf.point(pt))));
  rajkotPolygon = turf.convex(turf.featureCollection(allPoints));
}

// Generate random points inside the polygon
const bbox = turf.bbox(rajkotPolygon);
let points = [];

while (points.length < 18) {
  const pt = turf.randomPoint(1, { bbox: bbox }).features[0];
  if (turf.booleanPointInPolygon(pt, rajkotPolygon)) {
    let tooClose = false;
    for (const existingPt of points) {
      if (turf.distance(pt, existingPt) < 2) { 
        tooClose = true;
        break;
      }
    }
    if (!tooClose) {
      points.push(pt);
    }
  }
}

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
console.log('Created highly realistic organic ward boundaries in wardBoundaries.geojson');
