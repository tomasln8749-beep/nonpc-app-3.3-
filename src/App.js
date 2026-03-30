import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import {
  auth,
  db,
  doc,
  ensureUserDocument,
  onAuthStateChanged
} from "./firebase";
import { onSnapshot } from "firebase/firestore";
import Login from "./components/Login";
import Feed from "./components/Feed";
import Profile from "./components/Profile";

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      // Listen globally so the whole app reacts to login/logout in real time.
      if (!user) {
        setCurrentUser(null);
        setProfile(null);
        setLoading(false);
        if (unsubscribeProfile) {
          unsubscribeProfile();
        }
        return;
      }

      await ensureUserDocument(user);
      setCurrentUser(user);
      unsubscribeProfile = onSnapshot(doc(db, "users", user.uid), (snapshot) => {
        setProfile(snapshot.exists() ? snapshot.data() : null);
        setLoading(false);
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  const authContext = useMemo(
    () => ({
      currentUser,
      profile
    }),
    [currentUser, profile]
  );

  if (loading) {
    return (
      <div className="app-shell centered">
        <div className="glass-card loading-card">Loading NoNPC...</div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login />;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">NoNPC</p>
          <h1>Social Feed</h1>
        </div>

        <nav className="topbar-nav">
          <NavLink to="/" end className="nav-pill">
            Feed
          </NavLink>
          <NavLink to={`/profile/${currentUser.uid}`} className="nav-pill">
            Perfil
          </NavLink>
        </nav>
      </header>

      <main className="page-content">
        <Routes>
          <Route path="/" element={<Feed authContext={authContext} />} />
          <Route
            path="/profile/:uid"
            element={<Profile authContext={authContext} />}
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;
