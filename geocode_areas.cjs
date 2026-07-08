/**
 * Geocode RMC areas via Google Maps Geocoding API and assign ward
 * using official wardBoundaries.geojson (point-in-polygon).
 *
 * Requires GOOGLE_MAPS_API_KEY in .env
 * Run: node geocode_areas.cjs [--limit 200] [--force]
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { point, booleanPointInPolygon } from '@turf/turf';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? Number(limitArg.split('=')[1]) : 1695;
const FORCE = process.argv.includes('--force');

if (!API_KEY) {
  console.error('GOOGLE_MAPS_API_KEY missing in .env — add your Google Maps API key.');
  process.exit(1);
}

const areaWardMapping = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'areaWardMapping.json'), 'utf8')
);
const wardBoundaries = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'wardBoundaries.geojson'), 'utf8')
);

const cachePath = path.join(__dirname, 'areaGeocodes.json');
const cache = fs.existsSync(cachePath)
  ? JSON.parse(fs.readFileSync(cachePath, 'utf8'))
  : {};

function wardFromPoint(lng, lat) {
  const pt = point([lng, lat]);
  for (const feature of wardBoundaries.features) {
    if (booleanPointInPolygon(pt, feature)) {
      return feature.properties.id;
    }
  }
  return null;
}

async function geocodeArea(displayName) {
  const query = `${displayName}, Rajkot, Gujarat, India`;
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', query);
  url.searchParams.set('key', API_KEY);
  url.searchParams.set('region', 'in');
  url.searchParams.set('components', 'locality:Rajkot|administrative_area:Gujarat|country:IN');

  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== 'OK' || !data.results?.length) {
    return { ok: false, status: data.status, query };
  }

  const best = data.results[0];
  const { lat, lng } = best.geometry.location;
  const wardId = wardFromPoint(lng, lat);

  return {
    ok: true,
    displayName,
    lat,
    lng,
    formattedAddress: best.formatted_address,
    wardIdFromMap: wardId,
    placeId: best.place_id,
    geocodedAt: new Date().toISOString()
  };
}

const entries = Object.entries(areaWardMapping).slice(0, LIMIT);
let geocoded = 0;
let skipped = 0;
let failed = 0;

console.log(`Geocoding up to ${entries.length} areas via Google Maps…`);

for (const [key, entry] of entries) {
  if (!FORCE && cache[key]?.ok) {
    skipped++;
    continue;
  }

  try {
    const result = await geocodeArea(entry.displayName);
    cache[key] = {
      ...result,
      registryWardId: entry.wardId,
      wardMatch: result.wardIdFromMap === entry.wardId
    };

    if (result.ok) geocoded++;
    else failed++;

    if ((geocoded + failed) % 25 === 0) {
      fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
      console.log(`  Progress: ${geocoded} geocoded, ${failed} failed, ${skipped} skipped`);
    }

    await new Promise((r) => setTimeout(r, 120));
  } catch (err) {
    failed++;
    cache[key] = { ok: false, error: err.message, displayName: entry.displayName };
  }
}

fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));

const matched = Object.values(cache).filter((c) => c.ok && c.wardMatch).length;
const mismatched = Object.values(cache).filter((c) => c.ok && !c.wardMatch).length;

console.log('\nDone.');
console.log(`  Geocoded: ${geocoded}`);
console.log(`  Failed: ${failed}`);
console.log(`  Skipped (cached): ${skipped}`);
console.log(`  Ward matches RMC registry: ${matched}`);
console.log(`  Ward mismatches: ${mismatched}`);
console.log(`  Saved: areaGeocodes.json`);
