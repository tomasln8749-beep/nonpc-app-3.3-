import React, { useState } from "react";
import {
  auth,
  createUserWithEmailAndPassword,
  db,
  doc,
  ensureUserDocument,
  getDoc,
  googleProvider,
  setDoc,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile
} from "../firebase";

function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loginGoogle() {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        displayName: user.displayName || "NoNPC User",
        email: user.email || "",
        photoURL: user.photoURL || "",
        createdAt: new Date(),
        xp: 0
      });
    }

    console.log("Usuario vinculado a Firestore:", user.uid);
  }

  async function handleGoogleLogin() {
    try {
      setError("");
      await loginGoogle();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      if (isRegister) {
        const credentials = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName.trim()) {
          await updateProfile(credentials.user, {
            displayName: displayName.trim()
          });
        }
        await ensureUserDocument({
          ...credentials.user,
          displayName: displayName.trim() || credentials.user.displayName
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app-shell centered">
      <section className="glass-card auth-card">
        <p className="eyebrow">Bienvenido</p>
        <h1>NoNPC Social</h1>
        <p className="secondary-text">
          Comparte momentos, comenta y conecta con otros jugadores del mundo real.
        </p>

        <button className="primary-button full-width" onClick={handleGoogleLogin}>
          Continuar con Google
        </button>

        <div className="divider">
          <span>o usa email</span>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegister && (
            <input
              type="text"
              placeholder="Nombre visible"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          <button className="primary-button full-width" type="submit" disabled={submitting}>
            {submitting ? "Procesando..." : isRegister ? "Crear cuenta" : "Iniciar sesion"}
          </button>
        </form>

        <button
          className="ghost-button full-width"
          onClick={() => setIsRegister((prev) => !prev)}
        >
          {isRegister ? "Ya tengo cuenta" : "Crear cuenta con email"}
        </button>

        {error && <p className="error-text">{error}</p>}
      </section>
    </div>
  );
}

export default Login;
