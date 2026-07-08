import fs from 'fs';
import path from 'path';
import { centroid, point, booleanPointInPolygon } from '@turf/turf';
import { env } from '../config/env.js';
import { WARDS } from '../../shared/wards.js';

let areaWardMapping = null;
let wardBoundaryCollection = null;
let wardBoundaryFeatures = [];
let wardCentroids = {};

export function loadReferenceData() {
  const mappingPath = path.join(env.dataDir, 'areaWardMapping.json');
  const boundariesPath = path.join(env.dataDir, 'wardBoundaries.geojson');

  areaWardMapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
  wardBoundaryCollection = JSON.parse(fs.readFileSync(boundariesPath, 'utf8'));
  wardBoundaryFeatures = wardBoundaryCollection.features || [];

  wardCentroids = {};
  wardBoundaryFeatures.forEach((feature) => {
    const c = centroid(feature).geometry.coordinates;
    wardCentroids[feature.properties.id] = [c[1], c[0]];
  });
}

export function getAreaWardMapping() {
  if (!areaWardMapping) loadReferenceData();
  return areaWardMapping;
}

export function getWardBoundaries() {
  if (!wardBoundaryCollection) loadReferenceData();
  return wardBoundaryCollection;
}

export function getWardBoundaryFeatures() {
  if (!wardBoundaryFeatures.length) loadReferenceData();
  return wardBoundaryFeatures;
}

export function getWardCentroids() {
  if (!Object.keys(wardCentroids).length) loadReferenceData();
  return wardCentroids;
}

export function normalizeAreaKey(value) {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/&#39;/g, "'").replace(/\s+/g, ' ');
}

export function wardFromPoint(lng, lat) {
  const pt = point([lng, lat]);
  for (const feature of getWardBoundaryFeatures()) {
    if (booleanPointInPolygon(pt, feature)) {
      return feature.properties.id;
    }
  }
  return null;
}

export function wardCoords(wardId) {
  const centroids = getWardCentroids();
  if (wardId && centroids[wardId]) return [...centroids[wardId]];
  const ward = WARDS[wardId];
  if (!ward?.coords) return [22.30, 70.80];
  return [...ward.coords];
}

export function resolveWardFromText(text, explicitWardId, extractedArea) {
  const mapping = getAreaWardMapping();

  if (explicitWardId && WARDS[explicitWardId]) return explicitWardId;

  if (extractedArea) {
    const normalizedArea = normalizeAreaKey(extractedArea);
    if (mapping[normalizedArea]) return mapping[normalizedArea].wardId;

    if (normalizedArea.length >= 4) {
      const partial = Object.entries(mapping).find(([key]) =>
        key.length >= 4 && (normalizedArea.includes(key) || key.includes(normalizedArea))
      );
      if (partial) return partial[1].wardId;
    }
  }

  const wardMatch = text.match(/\b(?:ward|વોર્ડ|वार्ड)\s*[-#]?\s*(\d{1,2})\b/i);
  if (wardMatch) {
    const num = wardMatch[1].padStart(2, '0');
    const candidate = `RMC-${num}`;
    if (WARDS[candidate]) return candidate;
  }

  return explicitWardId || null;
}

export function generateTicketId(wardId) {
  const year = new Date().getFullYear();
  const ward = wardId ? wardId.replace('RMC-', '') : 'GEN';
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `RMC/${year}/W${ward}/${seq}`;
}
