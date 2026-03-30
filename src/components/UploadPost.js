import React, { useState } from "react";
import { addDoc, collection, db, serverTimestamp } from "firebase/firestore";
import {
  awardXp,
  getDownloadURL,
  ref,
  storage,
  uploadBytes
} from "../firebase";

function UploadPost({ authContext }) {
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file) {
      setError("Selecciona una imagen antes de publicar.");
      return;
    }

    setUploading(true);
    setError("");

    try {
      // Upload image first, then save the post document with the public URL.
      const fileRef = ref(
        storage,
        `posts/${authContext.currentUser.uid}/${Date.now()}-${file.name}`
      );

      await uploadBytes(fileRef, file);
      const imageURL = await getDownloadURL(fileRef);

      await addDoc(collection(db, "posts"), {
        userId: authContext.currentUser.uid,
        username: authContext.profile?.displayName || "NoNPC User",
        userPhotoURL: authContext.profile?.photoURL || "",
        imageURL,
        caption: caption.trim(),
        likes: [],
        timestamp: serverTimestamp()
      });

      await awardXp(authContext.currentUser.uid, 20);
      setFile(null);
      setCaption("");
      event.target.reset();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="glass-card upload-card">
      <div className="upload-header">
        <h2>Crear publicacion</h2>
        <p className="secondary-text">Sube una imagen y comparte algo del mundo real.</p>
      </div>

      <form className="upload-form" onSubmit={handleSubmit}>
        <input
          type="file"
          accept="image/*"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
        />

        <textarea
          placeholder="Escribe un caption..."
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          rows="3"
        />

        <button className="primary-button" type="submit" disabled={uploading}>
          {uploading ? "Subiendo..." : "Publicar"}
        </button>
      </form>

      {error && <p className="error-text">{error}</p>}
    </section>
  );
}

export default UploadPost;
