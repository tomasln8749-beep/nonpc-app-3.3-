import React, { useEffect, useState } from "react";
import { collection, db, query } from "firebase/firestore";
import { onSnapshot, orderBy } from "firebase/firestore";
import { auth, signOut } from "../firebase";
import Post from "./Post";
import UploadPost from "./UploadPost";

function Feed({ authContext }) {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const postsQuery = query(collection(db, "posts"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      setPosts(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
    });

    return unsubscribe;
  }, []);

  return (
    <div className="feed-layout">
      <aside className="glass-card sidebar-card">
        <div className="profile-badge">
          <img
            src={authContext.profile?.photoURL || "https://via.placeholder.com/80"}
            alt={authContext.profile?.displayName || "User avatar"}
            className="avatar large"
          />
          <div>
            <h2>{authContext.profile?.displayName || "NoNPC User"}</h2>
            <p className="secondary-text">{authContext.profile?.email}</p>
            <p className="xp-chip">XP: {authContext.profile?.xp || 0}</p>
          </div>
        </div>

        <button className="ghost-button full-width" onClick={() => signOut(auth)}>
          Logout
        </button>
      </aside>

      <section className="feed-column">
        <UploadPost authContext={authContext} />

        <div className="posts-stack">
          {posts.length === 0 ? (
            <div className="glass-card empty-card">Todavia no hay publicaciones.</div>
          ) : (
            posts.map((post) => (
              <Post
                key={post.id}
                post={post}
                currentUser={authContext.currentUser}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export default Feed;
