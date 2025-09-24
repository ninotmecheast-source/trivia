import React from "react";
import { Link } from "react-router-dom";

export default function Admin() {
  return (
    <div style={{ padding: "20px" }}>
      <h1>Admin Dashboard</h1>
      <p>Developer tools and utilities</p>

      <ul style={{ listStyle: "none", padding: 0 }}>
        <li>
          <Link to="/update-rss">📰 Update RSS Feed</Link>
        </li>
        {/* Add more tools as needed */}
        <li>
          <a
            href="/rss.xml"
            target="_blank"
            rel="noopener noreferrer"
          >
            📂 View RSS XML
          </a>
        </li>
        <li>
          <Link to="/news">/News</Link>
        </li>
        <li>
          <Link to="/">Triva</Link>
        </li>
      </ul>
    </div>
  );
}
