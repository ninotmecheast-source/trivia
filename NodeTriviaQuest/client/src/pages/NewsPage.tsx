import React, { useEffect, useState } from "react";

interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
}

export default function NewsPage() {
  const [items, setItems] = useState<RSSItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRSS = async () => {
      try {
        const res = await fetch("/rss.xml");
        const text = await res.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, "application/xml");

        let posts = Array.from(xml.querySelectorAll("item")).map((item) => ({
          title: item.querySelector("title")?.textContent || "",
          link: item.querySelector("link")?.textContent || "#",
          description: item.querySelector("description")?.textContent || "",
          pubDate: item.querySelector("pubDate")?.textContent || "",
        }));

        // 🔽 sort by pubDate (newest first)
        posts = posts.sort(
          (a, b) =>
            new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
        );

        setItems(posts);
      } catch (err) {
        console.error("Failed to fetch RSS:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRSS();
  }, []);

  if (loading) return <p>Loading news...</p>;

  return (
    <div style={{ maxWidth: "700px", margin: "0 auto", padding: "20px" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>📰 Triveast News</h1>
      {items.length === 0 && <p>No news yet.</p>}
      {items.map((post, idx) => (
        <article
          key={idx}
          style={{
            borderBottom: "1px solid #ddd",
            marginBottom: "1rem",
            paddingBottom: "1rem",
          }}
        >
          <h2>
            <a href={post.link} target="_blank" rel="noopener noreferrer">
              {post.title}
            </a>
          </h2>
          <p>{post.description}</p>
          <small>{new Date(post.pubDate).toLocaleString()}</small>
        </article>
      ))}
    </div>
  );
}
