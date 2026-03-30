import { initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile
} from "firebase/auth";
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getFirestore,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc
} from "firebase/firestore";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";

const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export {
  arrayRemove,
  arrayUnion,
  collection,
  createUserWithEmailAndPassword,
  doc,
  getDoc,
  getDownloadURL,
  increment,
  onAuthStateChanged,
  ref,
  serverTimestamp,
  setDoc,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateDoc,
  updateProfile,
  uploadBytes
};

export async function ensureUserDocument(user) {
  // Keep a matching Firestore profile for every authenticated user.
  const userRef = doc(db, "users", user.uid);
  const userSnapshot = await getDoc(userRef);

  if (!userSnapshot.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      displayName: user.displayName || "NoNPC User",
      email: user.email || "",
      photoURL: user.photoURL || "",
      xp: 0,
      createdAt: serverTimestamp()
    });
  } else {
    const data = userSnapshot.data();
    await setDoc(
      userRef,
      {
        uid: user.uid,
        displayName: user.displayName || data.displayName || "NoNPC User",
        email: user.email || data.email || "",
        photoURL: user.photoURL || data.photoURL || ""
      },
      { merge: true }
    );
  }
}

export async function awardXp(uid, amount) {
  // Small helper to keep XP updates consistent across actions.
  if (!uid || !amount) {
    return;
  }

  await updateDoc(doc(db, "users", uid), {
    xp: increment(amount)
  });
}
