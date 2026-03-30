import {
  auth,
  createUserWithEmailAndPassword,
  doc,
  getDoc,
  googleProvider,
  isFirebaseConfigured,
  onAuthStateChanged,
  runTransaction,
  setDoc,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  db,
  serverTimestamp
} from "./firebase-client.js";

const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,20}$/;
const XP_STORAGE_KEY = "nonpc-xp";
const DAILY_STREAK_STORAGE_KEY = "daily_streak_state";
const COMMUNITY_USER_STORAGE_KEY = "community_username";

let authResolved = false;
let authPromiseResolve = null;
let state = {
  loading: true,
  user: null,
  profile: null,
  configured: isFirebaseConfigured()
};
const listeners = new Set();

const authReady = new Promise((resolve) => {
  authPromiseResolve = resolve;
});

function getBasePrefix() {
  const segments = window.location.pathname.split("/").filter(Boolean);
  const last = segments[segments.length - 1] || "";
  const sectionPages = new Set(["community", "challenges", "feed", "missions", "ranking", "profile", "login", "setup-username"]);

  if (sectionPages.has(last)) {
    return "../";
  }

  if (last.endsWith(".html") && segments.length > 1) {
    return "../";
  }

  return "./";
}

export function toAppPath(pathname) {
  return `${getBasePrefix()}${pathname}`;
}

function notify() {
  listeners.forEach((listener) => listener(state));
}

function sanitizeUsername(username) {
  return username.trim().replace(/\s+/g, "");
}

function getLocalXpSeed() {
  return Math.max(0, Number(localStorage.getItem(XP_STORAGE_KEY)) || 0);
}

function getLocalStreakSeed() {
  try {
    const stored = JSON.parse(localStorage.getItem(DAILY_STREAK_STORAGE_KEY));
    return Math.max(0, Number(stored?.streak) || 0);
  } catch (error) {
    return 0;
  }
}

function getLevelFromXp(xp) {
  return Math.floor((Number(xp) || 0) / 100) + 1;
}

async function ensureUserDocument(user) {
  const userRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(userRef);
  if (snapshot.exists()) {
    return { id: user.uid, ...snapshot.data() };
  }

  const xp = getLocalXpSeed();
  const streak = getLocalStreakSeed();
  const profile = {
    id: user.uid,
    email: user.email || "",
    username: "",
    usernameKey: "",
    xp,
    level: getLevelFromXp(xp),
    streak,
    createdAt: new Date().toISOString(),
    lastDailyMissionDate: null
  };

  await setDoc(userRef, {
    ...profile,
    createdAt: serverTimestamp()
  });

  return profile;
}

function syncLegacyProfile(profile) {
  if (!profile) {
    localStorage.removeItem(COMMUNITY_USER_STORAGE_KEY);
    localStorage.removeItem(XP_STORAGE_KEY);
    return;
  }

  localStorage.setItem(COMMUNITY_USER_STORAGE_KEY, profile.username || "");
  localStorage.setItem(XP_STORAGE_KEY, String(Number(profile.xp) || 0));
}

if (state.configured) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      state = { ...state, loading: false, user: null, profile: null };
      syncLegacyProfile(null);
      notify();
      if (!authResolved) {
        authResolved = true;
        authPromiseResolve(state);
      }
      return;
    }

    const profile = await ensureUserDocument(user);
    state = { ...state, loading: false, user, profile };
    syncLegacyProfile(profile);
    notify();
    if (!authResolved) {
      authResolved = true;
      authPromiseResolve(state);
    }
  });
} else {
  state = { ...state, loading: false };
  authResolved = true;
  authPromiseResolve(state);
}

export function useAuth(listener) {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

export async function waitForAuth() {
  return authReady;
}

export function getAuthState() {
  return state;
}

export { isFirebaseConfigured };

export async function signInWithGoogle() {
  if (!auth) {
    throw new Error("Firebase no esta configurado.");
  }
  return signInWithPopup(auth, googleProvider);
}

export async function registerWithEmail(email, password) {
  if (!auth) {
    throw new Error("Firebase no esta configurado.");
  }
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function loginWithEmail(email, password) {
  if (!auth) {
    throw new Error("Firebase no esta configurado.");
  }
  return signInWithEmailAndPassword(auth, email, password);
}

export async function logout() {
  if (!auth) {
    return;
  }
  await signOut(auth);
}

export function validateUsername(username) {
  const value = sanitizeUsername(username);
  if (!USERNAME_REGEX.test(value)) {
    return {
      valid: false,
      sanitized: value,
      message: "Usa 3 a 20 caracteres: letras, numeros, punto, guion o guion bajo."
    };
  }

  return {
    valid: true,
    sanitized: value,
    message: ""
  };
}

export async function reserveUsername(username) {
  const current = getAuthState();
  if (!current.user) {
    throw new Error("Necesitas iniciar sesion.");
  }

  const validation = validateUsername(username);
  if (!validation.valid) {
    throw new Error(validation.message);
  }

  const usernameValue = validation.sanitized;
  const usernameKey = usernameValue.toLowerCase();
  const userRef = doc(db, "users", current.user.uid);
  const usernameRef = doc(db, "usernames", usernameKey);

  const nextProfile = await runTransaction(db, async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    const usernameSnapshot = await transaction.get(usernameRef);

    if (usernameSnapshot.exists() && usernameSnapshot.data().uid !== current.user.uid) {
      throw new Error("Ese username ya esta en uso.");
    }

    const existingUser = userSnapshot.exists() ? userSnapshot.data() : {};
    const previousUsernameKey = existingUser.usernameKey;

    if (previousUsernameKey && previousUsernameKey !== usernameKey) {
      throw new Error("El username ya fue definido para esta cuenta.");
    }

    transaction.set(userRef, {
      id: current.user.uid,
      email: current.user.email || "",
      username: usernameValue,
      usernameKey,
      xp: Number(existingUser.xp) || 0,
      level: getLevelFromXp(Number(existingUser.xp) || 0),
      streak: Number(existingUser.streak) || 0,
      createdAt: existingUser.createdAt || serverTimestamp()
    }, { merge: true });

    transaction.set(usernameRef, {
      uid: current.user.uid,
      username: usernameValue,
      createdAt: existingUser.createdAt || serverTimestamp()
    }, { merge: true });

    return {
      id: current.user.uid,
      ...existingUser,
      username: usernameValue,
      usernameKey
    };
  });

  state = { ...state, profile: nextProfile };
  syncLegacyProfile(nextProfile);
  notify();
  return nextProfile;
}

export async function guardAuthPage({ allowAnonymous = false, allowMissingUsername = false } = {}) {
  const current = await waitForAuth();
  const redirectAndStop = (path) => {
    window.location.replace(path);
    return new Promise(() => {});
  };

  if (!current.configured) {
    throw new Error("Firebase no esta configurado. Completa js/firebase-config.js antes de usar auth.");
  }

  if (!allowAnonymous && !current.user) {
    return redirectAndStop(toAppPath("login/"));
  }

  if (current.user && !allowMissingUsername && !current.profile?.username) {
    return redirectAndStop(toAppPath("setup-username/"));
  }

  if (current.user && allowAnonymous) {
    if (current.profile?.username) {
      return redirectAndStop(toAppPath("index.html"));
    } else {
      return redirectAndStop(toAppPath("setup-username/"));
    }
  }

  if (current.user && allowMissingUsername && current.profile?.username) {
    return redirectAndStop(toAppPath("index.html"));
  }

  return current;
}
