import { env } from '../config/env.js';
import { getAreaWardMapping, wardFromPoint, wardCoords, normalizeAreaKey } from './wardData.js';
import { getGeocode, saveGeocode } from './geocodesRepository.js';

export async function geocodeAreaName(displayName) {
  const mapping = getAreaWardMapping();
  const normalized = normalizeAreaKey(displayName);
  const registryKey = Object.keys(mapping).find(
    (k) => normalizeAreaKey(mapping[k].displayName) === normalized
  );
  const cacheKey = registryKey || normalized;

  const cached = await getGeocode(cacheKey);
  if (cached?.ok) return cached;

  const apiKey = env.googleMapsApiKey;
  if (!apiKey) return null;

  const query = `${displayName}, Rajkot, Gujarat, India`;
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', query);
  url.searchParams.set('key', apiKey);
  url.searchParams.set('region', 'in');

  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== 'OK' || !data.results?.length) {
    const fail = { ok: false, displayName, status: data.status };
    await saveGeocode(cacheKey, fail);
    return null;
  }

  const { lat, lng } = data.results[0].geometry.location;
  const wardIdFromMap = wardFromPoint(lng, lat);
  const registryWardId = registryKey ? mapping[registryKey].wardId : null;

  const result = {
    ok: true,
    displayName,
    lat,
    lng,
    coords: [lat, lng],
    formattedAddress: data.results[0].formatted_address,
    wardIdFromMap,
    registryWardId,
    wardMatch: wardIdFromMap === registryWardId,
    geocodedAt: new Date().toISOString()
  };

  await saveGeocode(cacheKey, result);
  return result;
}

export async function resolveAreaLocation(areaName, explicitWardId) {
  if (!areaName) {
    return { wardId: explicitWardId || null, coords: wardCoords(explicitWardId) };
  }

  const mapping = getAreaWardMapping();
  const normalized = normalizeAreaKey(areaName);
  let registryWardId = explicitWardId || null;
  if (mapping[normalized]) registryWardId = mapping[normalized].wardId;

  const geocoded = await geocodeAreaName(areaName);
  if (geocoded?.ok) {
    const wardId = registryWardId || geocoded.wardIdFromMap || explicitWardId;
    return {
      wardId,
      coords: [geocoded.lat, geocoded.lng],
      geocoded: true,
      formattedAddress: geocoded.formattedAddress
    };
  }

  return {
    wardId: registryWardId || explicitWardId,
    coords: wardCoords(registryWardId || explicitWardId)
  };
}
