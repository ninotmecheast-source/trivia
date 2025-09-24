import React, { useState } from "react";

export default function UpdateRSS() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [file, setFile] = useState<File | null>(null); // 👈 define file state
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    if (link) formData.append("link", link);
    if (file) formData.append("image", file); // 👈 attach file here

    try {
      const res = await fetch("/api/rss/add", {
        method: "POST",
        body: formData, // 👈 no headers needed
      });
      const data = await res.json();
      setMessage(data.message || "Post added!");
    } catch (err) {
      setMessage("Failed to update RSS.");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Post title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        placeholder="Write your post here..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <input
        type="file"
        onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} // 👈 setFile
      />
      <input
        type="text"
        placeholder="Optional link (leave blank if none)"
        value={link}
        onChange={(e) => setLink(e.target.value)}
      />
      <button type="submit">Publish Post</button>
      {message && <p>{message}</p>}
    </form>
  );
}
