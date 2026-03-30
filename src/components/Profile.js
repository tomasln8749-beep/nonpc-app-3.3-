import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { collection, db, doc, getDoc, query, where } from "firebase/firestore";
import { onSnapshot } from "firebase/firestore";

function Profile({ authContext }) {
  const { uid } = useParams();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    let unsubscribePosts = null;

    async function loadProfile() {
      const profileRef = doc(db, "users", uid);
      const profileSnapshot = await getDoc(profileRef);
      setProfile(profileSnapshot.exists() ? profileSnapshot.data() : null);

      const postsQuery = query(collection(db, "posts"), where("userId", "==", uid));
      unsubscribePosts = onSnapshot(postsQuery, (snapshot) => {
        const nextPosts = snapshot.docs
          .map((docItem) => ({ id: docItem.id, ...docItem.data() }))
          .sort((a, b) => {
            const aTime = a.timestamp?.seconds || 0;
            const bTime = b.timestamp?.seconds || 0;
            return bTime - aTime;
          });
        setPosts(nextPosts);
      });
    }

    loadProfile();

    return () => {
      if (unsubscribePosts) {
        unsubscribePosts();
      }
    };
  }, [uid]);

  if (!profile) {
    return <div className="glass-card empty-card">Perfil no encontrado.</div>;
  }

  return (
    <section className="profile-layout">
      <div className="glass-card profile-card">
        <div className="profile-badge">
          <img
            src={profile.photoURL || "https://via.placeholder.com/120"}
            alt={profile.displayName}
            className="avatar xlarge"
          />
          <div>
            <h2>{profile.displayName}</h2>
            <p className="secondary-text">{profile.email}</p>
            <div className="profile-stats">
              <span className="xp-chip">XP: {profile.xp || 0}</span>
              <span className="secondary-chip">Posts: {posts.length}</span>
            </div>
          </div>
        </div>

        {authContext.currentUser.uid === uid && (
          <p className="secondary-text">Este es tu perfil publico dentro de NoNPC.</p>
        )}
      </div>

      <div className="posts-grid">
        {posts.length === 0 ? (
          <div className="glass-card empty-card">Este usuario todavia no publico nada.</div>
        ) : (
          posts.map((post) => (
            <article key={post.id} className="glass-card mini-post-card">
              <img src={post.imageURL} alt={post.caption} className="mini-post-image" />
              <p>{post.caption}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

export default Profile;
