import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Calendar, Clock, ArrowLeft, ExternalLink } from "lucide-react";

interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  imageUrl?: string;
  imageType?: string;
}

export default function PostPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<RSSItem | null>(null);
  const [loading, setLoading] = useState(true);

  const createSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const stripHtmlAndFormat = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await fetch("/rss.xml");
        const text = await res.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, "application/xml");

        const posts = Array.from(xml.querySelectorAll("item")).map((item) => {
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

        // Find post by slug
        const foundPost = posts.find(p => createSlug(p.title) === slug);
        setPost(foundPost || null);
      } catch (err) {
        console.error("Failed to fetch post:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex items-center gap-3 text-lg font-medium text-gray-600">
              <div className="animate-spin w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full"></div>
              Loading post...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="text-center py-16">
            <div className="p-8 bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg inline-block">
              <p className="text-gray-600 text-xl mb-4">📰 Post not found</p>
              <button
                onClick={() => navigate('/news')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-200 hover:scale-105 hover:shadow-lg font-medium"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to News
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <button
            onClick={() => navigate('/news')}
            className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-all duration-200 font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to News
          </button>
          
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            {post.title}
          </h1>
          
          <div className="flex items-center gap-6 text-blue-100">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <span className="text-lg">{formatDate(post.pubDate)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <span className="text-lg">
                {new Date(post.pubDate).toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit',
                  hour12: true 
                })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Post Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <article className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 overflow-hidden">
          {/* Featured Image - Full Size */}
          {post.imageUrl && (
            <div className="relative overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
              <img
                src={post.imageUrl}
                alt={post.title}
                className="w-full h-96 md:h-[500px] lg:h-[600px] object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  const container = target.closest('.relative') as HTMLElement;
                  if (container) container.style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
            </div>
          )}

          {/* Content */}
          <div className="p-8 md:p-12">
            {/* Content Body */}
            <div className="prose prose-xl max-w-none mb-8">
              <div className="text-gray-700 leading-relaxed text-lg md:text-xl whitespace-pre-wrap">
                {stripHtmlAndFormat(post.description)}
              </div>
            </div>

            {/* External Link */}
            {post.link && post.link !== "https://triveast.com/news" && (
              <div className="pt-8 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 font-medium">Read the original article:</span>
                  <a
                    href={post.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-200 hover:scale-105 hover:shadow-lg font-medium"
                  >
                    View External Link
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </article>

        {/* Back to News */}
        <div className="text-center mt-12">
          <button
            onClick={() => navigate('/news')}
            className="inline-flex items-center gap-2 px-8 py-4 bg-white/80 backdrop-blur-sm border-2 border-blue-200 text-blue-700 rounded-xl hover:bg-white hover:border-blue-300 hover:scale-105 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to All News
          </button>
        </div>
      </div>
    </div>
  );
}