import { getFirestore } from '../config/firebase.js';

const COLLECTION = 'geocodes';

export async function getAllGeocodes() {
  const snap = await getFirestore().collection(COLLECTION).get();
  const cache = {};
  snap.docs.forEach((doc) => {
    cache[doc.id] = doc.data();
  });
  return cache;
}

export async function getGeocode(cacheKey) {
  const doc = await getFirestore().collection(COLLECTION).doc(cacheKey).get();
  return doc.exists ? doc.data() : null;
}

export async function saveGeocode(cacheKey, result) {
  await getFirestore().collection(COLLECTION).doc(cacheKey).set(result, { merge: true });
  return result;
}
