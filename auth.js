import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from './firebase-config.js';

let authReady = false;
let authReadyPromise = null;

function waitForAuth() {
  if (authReady) return Promise.resolve();
  if (!authReadyPromise) {
    authReadyPromise = new Promise((resolve) => {
      onAuthStateChanged(auth, () => {
        authReady = true;
        resolve();
      });
    });
  }
  return authReadyPromise;
}

export async function getIdToken() {
  await waitForAuth();
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

export async function getSession() {
  await waitForAuth();
  const user = auth.currentUser;
  if (!user) return null;
  return {
    email: user.email,
    name: user.displayName || user.email?.split('@')[0] || 'Officer',
    role: 'officer'
  };
}

export async function login(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    return {
      ok: true,
      session: {
        email: cred.user.email,
        name: cred.user.displayName || cred.user.email?.split('@')[0],
        role: 'officer'
      }
    };
  } catch {
    return { ok: false, error: 'Invalid email or password' };
  }
}

export async function logout() {
  await signOut(auth);
}

export async function requireAuth(redirectTo = '/login.html') {
  const session = await getSession();
  if (session) return session;
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.href = `${redirectTo}?next=${next}`;
  return null;
}

export function initLoginPage() {
  const form = document.getElementById('login-form');
  const errorEl = document.getElementById('login-error');
  if (!form) return;

  waitForAuth().then(async () => {
    if (await getSession()) {
      const params = new URLSearchParams(window.location.search);
      window.location.href = params.get('next') || '/dashboard.html';
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email')?.value || '';
    const password = document.getElementById('login-password')?.value || '';
    const result = await login(email, password);

    if (!result.ok) {
      if (errorEl) {
        errorEl.textContent = result.error;
        errorEl.classList.remove('hidden');
      }
      return;
    }

    const params = new URLSearchParams(window.location.search);
    window.location.href = params.get('next') || '/dashboard.html';
  });
}
