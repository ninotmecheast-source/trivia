import React, { useEffect, useState } from "react";
import { ExternalLink, Calendar, Clock, Sparkles } from "lucide-react";

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex items-center gap-3 text-lg font-medium text-gray-600">
              <div className="animate-spin w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full"></div>
              Loading latest news...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
              <Sparkles className="h-8 w-8" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold">
              Triveast News
            </h1>
          </div>
          <p className="text-xl text-blue-100 max-w-2xl">
            Stay updated with the latest announcements, features, and insights from our platform
          </p>
        </div>
      </div>

      {/* News Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {items.length === 0 ? (
          <div className="text-center py-16">
            <div className="p-4 bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg inline-block">
              <p className="text-gray-600 text-lg">📰 No news articles yet</p>
              <p className="text-gray-500 text-sm mt-2">Check back soon for updates!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {items.map((post, idx) => (
              <article
                key={idx}
                className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl border border-white/50 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:bg-white/90"
              >
                {/* Article Header */}
                <div className="p-8">
                  {/* Title */}
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4 group-hover:text-blue-600 transition-colors duration-300">
                    <a 
                      href={post.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 hover:no-underline"
                    >
                      <span className="flex-1">{post.title}</span>
                      <ExternalLink className="h-5 w-5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-blue-500 flex-shrink-0" />
                    </a>
                  </h2>

                  {/* Meta Information */}
                  <div className="flex items-center gap-6 mb-6 text-sm text-gray-600">
                    <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      <span>{formatDate(post.pubDate)}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-purple-50 px-3 py-1 rounded-full">
                      <Clock className="h-4 w-4 text-purple-500" />
                      <span>{new Date(post.pubDate).toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit',
                        hour12: true 
                      })}</span>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="prose prose-lg max-w-none">
                    <p className="text-gray-700 leading-relaxed text-lg">
                      {stripHtmlAndFormat(post.description)}
                    </p>
                  </div>

                  {/* Read More Link */}
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <a
                      href={post.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-200 hover:scale-105 hover:shadow-lg font-medium"
                    >
                      Read Full Article
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Back to Home */}
        <div className="text-center mt-16">
          <a
            href="/"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white/80 backdrop-blur-sm border-2 border-blue-200 text-blue-700 rounded-xl hover:bg-white hover:border-blue-300 hover:scale-105 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
          >
            ← Back to Trivia Game
          </a>
        </div>
      </div>
    </div>
  );
}
