import { getFirestore } from '../config/firebase.js';

const COLLECTION = 'suggestions';

export async function getAllSuggestions() {
  const snap = await getFirestore()
    .collection(COLLECTION)
    .orderBy('timestamp', 'desc')
    .get();

  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function createSuggestion(suggestion) {
  const ref = getFirestore().collection(COLLECTION).doc(suggestion.id);
  await ref.set(suggestion);
  return suggestion;
}

export async function deleteSuggestion(id) {
  await getFirestore().collection(COLLECTION).doc(id).delete();
  return { ok: true };
}
