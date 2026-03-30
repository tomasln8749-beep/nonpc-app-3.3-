import React, { useMemo, useState } from "react";
import { arrayRemove, arrayUnion, db, doc, updateDoc } from "../firebase";
import Comments from "./Comments";

function Post({ post, currentUser }) {
  const [showComments, setShowComments] = useState(false);

  const hasLiked = useMemo(
    () => Array.isArray(post.likes) && post.likes.includes(currentUser.uid),
    [post.likes, currentUser.uid]
  );

  async function toggleLike() {
    const postRef = doc(db, "posts", post.id);
    await updateDoc(postRef, {
      likes: hasLiked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid)
    });
  }

  return (
    <article className="glass-card post-card">
      <div className="post-header">
        <div className="author-row">
          <img
            src={post.userPhotoURL || "https://via.placeholder.com/48"}
            alt={post.username}
            className="avatar"
          />
          <div>
            <strong>{post.username}</strong>
            <p className="secondary-text">@{post.username?.toLowerCase()?.replace(/\s+/g, "")}</p>
          </div>
        </div>
      </div>

      <img src={post.imageURL} alt={post.caption} className="post-image" />

      <div className="post-body">
        <p className="post-caption">
          <strong>{post.username}</strong> {post.caption}
        </p>

        <div className="post-actions">
          <button className="ghost-button" onClick={toggleLike}>
            {hasLiked ? "Quitar like" : "Like"} · {post.likes?.length || 0}
          </button>

          <button className="ghost-button" onClick={() => setShowComments((prev) => !prev)}>
            {showComments ? "Ocultar comentarios" : "Ver comentarios"}
          </button>
        </div>

        {showComments && <Comments postId={post.id} currentUser={currentUser} />}
      </div>
    </article>
  );
}

export default Post;
