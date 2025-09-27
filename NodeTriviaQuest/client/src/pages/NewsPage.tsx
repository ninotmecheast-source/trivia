import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  imageUrl?: string;
  imageType?: string;
}

export default function NewsPage() {
  const [items, setItems] = useState<RSSItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const createSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  useEffect(() => {
    const fetchRSS = async () => {
      try {
        const res = await fetch("/rss.xml");
        const text = await res.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, "application/xml");

        let posts = Array.from(xml.querySelectorAll("item")).map((item) => {
          const enclosure = item.querySelector("enclosure");
          return {
            title: item.querySelector("title")?.textContent || "",
            link: item.querySelector("link")?.textContent || "#",
            description: item.querySelector("description")?.textContent || "",
            pubDate: item.querySelector("pubDate")?.textContent || "",
            imageUrl: enclosure?.getAttribute("url") || undefined,
            imageType: enclosure?.getAttribute("type") || undefined,
          };
        });

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const stripHtmlAndFormat = (html: string) => {
    // Remove HTML tags and decode entities
    const div = document.createElement('div');
    div.innerHTML = html;
    const text = div.textContent || div.innerText || '';
    
    // Truncate if too long
    if (text.length > 300) {
      return text.substring(0, 300) + '...';
    }
    return text;
  };

  if (loading) return <p>Loading news...</p>;

  return (
    <div style={{ maxWidth: "700px", margin: "0 auto", padding: "20px" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>📰 Triveast News</h1>
      {items.length === 0 && <p>No news yet.</p>}
      {items.map((post, idx) => (
        <article
          key={idx}
          onClick={() => navigate(`/post/${createSlug(post.title)}`)}
          style={{
            borderBottom: "1px solid #ddd",
            marginBottom: "1rem",
            paddingBottom: "1rem",
            cursor: "pointer",
            display: "flex",
            gap: "15px",
            alignItems: "flex-start"
          }}
        >
          {/* Small Thumbnail */}
          {post.imageUrl && (
            <img
              src={post.imageUrl}
              alt={post.title}
              style={{
                width: "60px",
                height: "60px",
                objectFit: "cover",
                borderRadius: "4px",
                flexShrink: 0
              }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          )}
          
          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: "0 0 8px 0", fontSize: "1.2rem" }}>
              {post.title}
            </h2>
            <p style={{ margin: "0 0 8px 0", color: "#666", fontSize: "0.9rem" }}>
              {stripHtmlAndFormat(post.description)}
            </p>
            <small style={{ color: "#888" }}>
              {formatDate(post.pubDate)}
            </small>
          </div>
        </article>
      ))}
      
      <div style={{ textAlign: "center", marginTop: "2rem" }}>
        <a
          href="/"
          style={{
            display: "inline-block",
            padding: "10px 20px",
            backgroundColor: "#007bff",
            color: "white",
            textDecoration: "none",
            borderRadius: "4px"
          }}
        >
          ← Back to Trivia Game
        </a>
      </div>
    </div>
  );
}
