import React, { useEffect, useState } from "react";
import { addDoc, collection, db, orderBy, query, serverTimestamp } from "firebase/firestore";
import { onSnapshot } from "firebase/firestore";
import { awardXp } from "../firebase";

function Comments({ postId, currentUser }) {
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    // Comments update live from the post subcollection.
    const commentsQuery = query(
      collection(db, "posts", postId, "comments"),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      setComments(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
    });

    return unsubscribe;
  }, [postId]);

  async function handleCommentSubmit(event) {
    event.preventDefault();
    if (!commentText.trim()) {
      return;
    }

    setSending(true);
    try {
      await addDoc(collection(db, "posts", postId, "comments"), {
        userId: currentUser.uid,
        username: currentUser.displayName || currentUser.email?.split("@")[0] || "NoNPC User",
        commentText: commentText.trim(),
        timestamp: serverTimestamp()
      });

      await awardXp(currentUser.uid, 2);
      setCommentText("");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="comments-block">
      <div className="comments-list">
        {comments.map((comment) => (
          <div key={comment.id} className="comment-row">
            <strong>{comment.username}</strong>
            <span>{comment.commentText}</span>
          </div>
        ))}
      </div>

      <form className="comment-form" onSubmit={handleCommentSubmit}>
        <input
          type="text"
          value={commentText}
          onChange={(event) => setCommentText(event.target.value)}
          placeholder="Escribe un comentario..."
        />
        <button className="primary-button" type="submit" disabled={sending}>
          {sending ? "Enviando..." : "Comentar"}
        </button>
      </form>
    </div>
  );
}

export default Comments;
