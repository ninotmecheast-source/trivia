import React, { useState, useEffect } from "react";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { TextAlign } from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Badge } from "./components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Separator } from "./components/ui/separator";
import { Alert, AlertDescription } from "./components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./components/ui/dialog";
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  Link2,
  Save,
  Send,
  Eye,
  FileText,
  Tag,
  Calendar,
  Image as ImageIcon,
  Sparkles
} from "lucide-react";

interface Draft {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  link: string;
  createdAt: string;
  updatedAt: string;
  lastSavedHash?: string;
}

interface Template {
  id: string;
  name: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
}

const POST_TEMPLATES: Template[] = [
  {
    id: "announcement",
    name: "📢 Announcement",
    title: "Important Announcement",
    content: "<h2>We're excited to announce...</h2><p>We're thrilled to share some exciting news with our community. [Your announcement details here]</p><ul><li>Key point 1</li><li>Key point 2</li><li>Key point 3</li></ul><p>Thank you for your continued support!</p>",
    category: "announcements",
    tags: ["news", "important"]
  },
  {
    id: "update",
    name: "🔄 Product Update",
    title: "Latest Updates & Features",
    content: "<h2>What's New</h2><p>We've been hard at work improving your experience. Here's what's new:</p><h3>New Features</h3><ul><li>Feature 1: [Description]</li><li>Feature 2: [Description]</li></ul><h3>Improvements</h3><ul><li>Enhancement 1</li><li>Bug fixes</li></ul>",
    category: "updates",
    tags: ["features", "improvements"]
  },
  {
    id: "event",
    name: "📅 Event Notice",
    title: "Upcoming Event",
    content: "<h2>Join Us for [Event Name]</h2><p><strong>Date:</strong> [Event Date]<br><strong>Time:</strong> [Event Time]<br><strong>Location:</strong> [Event Location]</p><p>[Event description and details]</p><p><strong>How to participate:</strong></p><ul><li>Step 1</li><li>Step 2</li></ul>",
    category: "events",
    tags: ["event", "community"]
  }
];

const POST_CATEGORIES = [
  "general", "announcements", "updates", "events", "news", "tech", "community"
];

export default function UpdateRSS() {
  // Form state
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("general");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  
  // Editor state
  const [activeTab, setActiveTab] = useState("compose");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [lastSavedHash, setLastSavedHash] = useState<string>("");
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken') || 'admin123');
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  // Smart suggestions
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: false, // Disable the default link to avoid conflicts
      }),
      TextStyle,
      Color,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 hover:underline cursor-pointer',
        },
      }),
    ],
    content: '<p>Start writing your post here...</p>',
    onUpdate: ({ editor }) => {
      const content = editor.getHTML();
      generateSmartSuggestions(content);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[200px] p-4',
      },
    },
  });

  // Load drafts from localStorage on mount
  useEffect(() => {
    const savedDrafts = localStorage.getItem('rss-drafts');
    if (savedDrafts) {
      setDrafts(JSON.parse(savedDrafts));
    }
  }, []);

  // Generate content hash for change detection (UTF-8 safe)
  const generateContentHash = () => {
    try {
      const content = JSON.stringify({
        title,
        content: editor?.getHTML() || '',
        category,
        tags,
        link
      });
      
      // UTF-8 safe hash function
      let hash = 0;
      for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return Math.abs(hash).toString(36).slice(0, 20);
    } catch (error) {
      console.error('Hash generation error:', error);
      return Date.now().toString(); // Fallback to timestamp
    }
  };

  // Auto-save draft every 30 seconds with change detection
  useEffect(() => {
    const interval = setInterval(() => {
      const currentHash = generateContentHash();
      if (currentHash !== lastSavedHash && (title || editor?.getHTML() !== '<p>Start writing your post here...</p>')) {
        saveDraft();
        setLastSavedHash(currentHash);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [title, editor, category, tags, link, lastSavedHash]);

  const generateSmartSuggestions = (content: string) => {
    // Simple smart suggestions based on content
    const suggestions: string[] = [];
    
    if (content.includes('announce')) {
      suggestions.push('We are excited to share');
      suggestions.push('Stay tuned for more updates');
    }
    
    if (content.includes('update')) {
      suggestions.push('Thank you for your patience');
      suggestions.push('Please let us know your feedback');
    }
    
    if (content.includes('event')) {
      suggestions.push('We look forward to seeing you there');
      suggestions.push('Registration is now open');
    }

    setSuggestions(suggestions);
    setShowSuggestions(suggestions.length > 0);
  };

  const applySuggestion = (suggestion: string) => {
    if (editor) {
      editor.chain().focus().insertContent(` ${suggestion}`).run();
    }
    setShowSuggestions(false);
  };

  const applyTemplate = (template: Template) => {
    setTitle(template.title);
    setCategory(template.category);
    setTags(template.tags);
    if (editor) {
      editor.commands.setContent(template.content);
    }
  };

  const saveDraft = () => {
    if (!title && (!editor || editor.getHTML() === '<p>Start writing your post here...</p>')) return;
    
    setIsDraftSaving(true);
    const currentHash = generateContentHash();
    
    let draft: Draft;
    let updatedDrafts: Draft[];
    
    if (currentDraftId) {
      // Update existing draft
      draft = {
        id: currentDraftId,
        title: title || "Untitled Draft",
        content: editor?.getHTML() || "",
        category,
        tags,
        link,
        createdAt: drafts.find(d => d.id === currentDraftId)?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastSavedHash: currentHash
      };
      updatedDrafts = drafts.map(d => d.id === currentDraftId ? draft : d);
    } else {
      // Create new draft
      const newId = Date.now().toString();
      draft = {
        id: newId,
        title: title || "Untitled Draft",
        content: editor?.getHTML() || "",
        category,
        tags,
        link,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastSavedHash: currentHash
      };
      updatedDrafts = [draft, ...drafts];
      setCurrentDraftId(newId);
    }

    setDrafts(updatedDrafts);
    localStorage.setItem('rss-drafts', JSON.stringify(updatedDrafts));
    setLastSavedHash(currentHash);
    
    setTimeout(() => setIsDraftSaving(false), 1000);
  };

  const loadDraft = (draft: Draft) => {
    setTitle(draft.title);
    setCategory(draft.category);
    setTags(draft.tags);
    setLink(draft.link);
    if (editor) {
      editor.commands.setContent(draft.content);
    }
    setCurrentDraftId(draft.id);
    setLastSavedHash(draft.lastSavedHash || '');
    setActiveTab("compose");
  };

  const deleteDraft = (draftId: string) => {
    const updatedDrafts = drafts.filter(d => d.id !== draftId);
    setDrafts(updatedDrafts);
    localStorage.setItem('rss-drafts', JSON.stringify(updatedDrafts));
  };

  const addTag = () => {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editor) return;

    setIsPublishing(true);

    const formData = new FormData();
    formData.append("title", title);
    
    // Send rich HTML content and plain text fallback
    const htmlContent = editor.getHTML();
    formData.append("description", htmlContent); // Rich HTML content
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    formData.append("plainDescription", tempDiv.textContent || tempDiv.innerText || "");
    
    // Include category and tags in the payload
    formData.append("category", category);
    formData.append("tags", JSON.stringify(tags));
    
    if (link) formData.append("link", link);
    if (file) formData.append("image", file);

    try {
      // Check if admin token is available
      const token = adminToken || localStorage.getItem('adminToken');
      if (!token) {
        setShowAuthDialog(true);
        setIsPublishing(false);
        return;
      }

      const res = await fetch("/api/rss/add", {
        method: "POST",
        headers: {
          'X-Admin-Token': token
        },
        body: formData,
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || `Server error: ${res.status}`);
      }
      
      setMessage(data.message || "Post published successfully! 🎉");
      
      // Clear form after successful publish
      setTitle("");
      setLink("");
      setFile(null);
      setCategory("general");
      setTags([]);
      setCurrentDraftId(null);
      setLastSavedHash("");
      editor.commands.setContent("<p>Start writing your post here...</p>");
      
      // Remove draft if it was being edited
      if (currentDraftId) {
        const updatedDrafts = drafts.filter(d => d.id !== currentDraftId);
        setDrafts(updatedDrafts);
        localStorage.setItem('rss-drafts', JSON.stringify(updatedDrafts));
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to publish post. Please try again.";
      setMessage(errorMessage);
      console.error('Publish error:', error);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleAuthSubmit = () => {
    if (adminToken.trim()) {
      localStorage.setItem('adminToken', adminToken.trim());
      setShowAuthDialog(false);
      setMessage('Admin token saved. You can now publish posts.');
    }
  };

  const handleLinkClick = () => {
    const previousUrl = editor.getAttributes('link').href;
    setLinkUrl(previousUrl || '');
    setShowLinkDialog(true);
  };

  const handleSetLink = () => {
    if (linkUrl === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    }
    setShowLinkDialog(false);
    setLinkUrl('');
  };

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="text-center py-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4">
            RSS Content Studio
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Create, manage, and publish beautiful content with our advanced editor
          </p>
        </div>
        
        <Card className="backdrop-blur-sm bg-white/80 shadow-2xl border-0 rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-indigo-500/10 border-b border-white/20">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              Content Manager
            </CardTitle>
          </CardHeader>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="bg-gradient-to-r from-slate-50 to-blue-50/50 px-8 py-4 border-b border-white/30">
              <TabsList className="grid w-full grid-cols-4 bg-white/60 backdrop-blur-sm rounded-xl p-1 shadow-lg border border-white/20">
                <TabsTrigger 
                  value="compose" 
                  className="rounded-lg transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg font-medium"
                >
                  ✨ Compose
                </TabsTrigger>
                <TabsTrigger 
                  value="templates"
                  className="rounded-lg transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg font-medium"
                >
                  📚 Templates
                </TabsTrigger>
                <TabsTrigger 
                  value="drafts"
                  className="rounded-lg transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg font-medium"
                >
                  📝 Drafts ({drafts.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="preview"
                  className="rounded-lg transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg font-medium"
                >
                  👁️ Preview
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="compose" className="p-8 space-y-8 bg-gradient-to-br from-white/50 to-blue-50/30">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Title and metadata */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-2">
                    <Label htmlFor="title" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      📰 Post Title
                    </Label>
                    <Input
                      id="title"
                      type="text"
                      placeholder="Enter an engaging title for your post..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="text-lg font-semibold h-12 border-2 border-transparent bg-white/80 backdrop-blur-sm rounded-xl shadow-sm hover:shadow-md transition-all duration-300 focus:border-blue-400 focus:bg-white focus:shadow-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      🏷️ Category
                    </Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="h-12 border-2 border-transparent bg-white/80 backdrop-blur-sm rounded-xl shadow-sm hover:shadow-md transition-all duration-300 focus:border-blue-400 focus:bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="backdrop-blur-sm bg-white/95 border-white/20 rounded-xl shadow-2xl">
                        {POST_CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat} className="rounded-lg hover:bg-blue-50 transition-colors">
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Rich text editor with toolbar */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    ✏️ Content Editor
                  </Label>
                  
                  {/* Editor toolbar */}
                  <div className="bg-gradient-to-r from-white/80 to-slate-50/80 backdrop-blur-sm rounded-t-2xl border-2 border-blue-100/50 p-4 flex flex-wrap items-center gap-2 shadow-lg">
                    <div className="flex items-center gap-1 bg-white/60 rounded-lg p-1 shadow-sm border border-white/30">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        className={`h-9 w-9 rounded-md transition-all duration-200 hover:scale-105 ${
                          editor.isActive('bold') 
                            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md' 
                            : 'hover:bg-blue-50'
                        }`}
                      >
                        <Bold className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        className={`h-9 w-9 rounded-md transition-all duration-200 hover:scale-105 ${
                          editor.isActive('italic') 
                            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md' 
                            : 'hover:bg-blue-50'
                        }`}
                      >
                        <Italic className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <Separator orientation="vertical" className="h-8 bg-gray-300/50" />
                    
                    <div className="flex items-center gap-1 bg-white/60 rounded-lg p-1 shadow-sm border border-white/30">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        className={`h-9 w-9 rounded-md transition-all duration-200 hover:scale-105 ${
                          editor.isActive('bulletList') 
                            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md' 
                            : 'hover:bg-blue-50'
                        }`}
                      >
                        <List className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        className={`h-9 w-9 rounded-md transition-all duration-200 hover:scale-105 ${
                          editor.isActive('orderedList') 
                            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md' 
                            : 'hover:bg-blue-50'
                        }`}
                      >
                        <ListOrdered className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <Separator orientation="vertical" className="h-8 bg-gray-300/50" />
                    
                    <div className="flex items-center gap-1 bg-white/60 rounded-lg p-1 shadow-sm border border-white/30">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleLinkClick}
                        className={`h-9 w-9 rounded-md transition-all duration-200 hover:scale-105 ${
                          editor.isActive('link') 
                            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md' 
                            : 'hover:bg-blue-50'
                        }`}
                      >
                        <Link2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <Separator orientation="vertical" className="h-8 bg-gray-300/50" />
                    
                    <div className="flex items-center gap-1 bg-white/60 rounded-lg p-1 shadow-sm border border-white/30">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().setTextAlign('left').run()}
                        className={`h-9 w-9 rounded-md transition-all duration-200 hover:scale-105 ${
                          editor.isActive({ textAlign: 'left' }) 
                            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md' 
                            : 'hover:bg-blue-50'
                        }`}
                      >
                        <AlignLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().setTextAlign('center').run()}
                        className={`h-9 w-9 rounded-md transition-all duration-200 hover:scale-105 ${
                          editor.isActive({ textAlign: 'center' }) 
                            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md' 
                            : 'hover:bg-blue-50'
                        }`}
                      >
                        <AlignCenter className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().setTextAlign('right').run()}
                        className={`h-9 w-9 rounded-md transition-all duration-200 hover:scale-105 ${
                          editor.isActive({ textAlign: 'right' }) 
                            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md' 
                            : 'hover:bg-blue-50'
                        }`}
                      >
                        <AlignRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="bg-white/90 backdrop-blur-sm border-2 border-blue-100/50 border-t-0 rounded-b-2xl min-h-[400px] relative shadow-lg overflow-hidden">
                    <div className="p-6">
                      <EditorContent 
                        editor={editor} 
                        className="prose prose-lg max-w-none focus:outline-none min-h-[350px] text-gray-800 leading-relaxed"
                        style={{ whiteSpace: 'pre-wrap' }}
                      />
                    </div>
                    
                    {/* Smart suggestions with beautiful styling */}
                    {showSuggestions && suggestions.length > 0 && (
                      <div className="absolute bottom-4 right-4 bg-gradient-to-br from-white/95 to-blue-50/95 backdrop-blur-sm border border-blue-200/50 rounded-2xl shadow-2xl p-4 max-w-xs z-10 animate-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center justify-between gap-2 mb-3 text-sm font-semibold text-gray-700">
                          <div className="flex items-center gap-2">
                            <div className="p-1 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg">
                              <Sparkles className="h-3 w-3 text-white" />
                            </div>
                            Smart Suggestions
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 rounded-full hover:bg-red-100 transition-colors"
                            onClick={() => setShowSuggestions(false)}
                          >
                            ×
                          </Button>
                        </div>
                        {suggestions.map((suggestion, index) => (
                          <Button
                            key={index}
                            variant="ghost"
                            size="sm"
                            className="w-full text-left justify-start text-xs p-2 h-auto mb-1 rounded-lg hover:bg-blue-50 transition-all duration-200 hover:shadow-sm"
                            onClick={() => applySuggestion(suggestion)}
                          >
                            💡 {suggestion}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tags */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    🏷️ Tags
                  </Label>
                  <div className="flex flex-wrap gap-2 mb-3 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-blue-100/50 min-h-[60px]">
                    {tags.map(tag => (
                      <Badge 
                        key={tag} 
                        variant="secondary" 
                        className="cursor-pointer bg-gradient-to-r from-blue-100 to-purple-100 hover:from-blue-200 hover:to-purple-200 border border-blue-200/50 text-blue-800 transition-all duration-200 hover:scale-105 hover:shadow-md px-3 py-1" 
                        onClick={() => removeTag(tag)}
                      >
                        {tag} ×
                      </Badge>
                    ))}
                    {tags.length === 0 && (
                      <span className="text-gray-400 italic">No tags added yet...</span>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Input
                      type="text"
                      placeholder="Add a tag..."
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      className="flex-1 h-10 border-2 border-transparent bg-white/80 backdrop-blur-sm rounded-xl shadow-sm hover:shadow-md transition-all duration-300 focus:border-blue-400 focus:bg-white"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={addTag}
                      className="h-10 px-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 rounded-xl shadow-sm hover:shadow-lg hover:scale-105 transition-all duration-200"
                    >
                      <Tag className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Link and image */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="link" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      🔗 Link (optional)
                    </Label>
                    <Input
                      id="link"
                      type="url"
                      placeholder="https://example.com"
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                      className="h-10 border-2 border-transparent bg-white/80 backdrop-blur-sm rounded-xl shadow-sm hover:shadow-md transition-all duration-300 focus:border-blue-400 focus:bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="image" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      🖼️ Image (optional)
                    </Label>
                    <Input
                      id="image"
                      type="file"
                      accept="image/jpeg,image/png,image/gif"
                      onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                      className="h-10 border-2 border-transparent bg-white/80 backdrop-blur-sm rounded-xl shadow-sm hover:shadow-md transition-all duration-300 focus:border-blue-400 focus:bg-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex justify-between items-center pt-4 border-t border-blue-100/50">
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={saveDraft}
                      disabled={isDraftSaving}
                      className="h-12 px-6 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl shadow-sm hover:shadow-lg hover:scale-105 transition-all duration-200 hover:bg-white hover:border-gray-300"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isDraftSaving ? "Saving..." : "Save Draft"}
                    </Button>
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isPublishing}
                    className="h-12 px-8 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white border-0 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 font-semibold"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isPublishing ? "Publishing..." : "Publish Post"}
                  </Button>
                </div>

                {message && (
                  <Alert>
                    <AlertDescription>{message}</AlertDescription>
                  </Alert>
                )}
              </form>

              {/* Link Dialog */}
              <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Insert Link</DialogTitle>
                    <DialogDescription>
                      Enter the URL you want to link to
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      type="url"
                      placeholder="https://example.com"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSetLink()}
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSetLink}>
                        {linkUrl ? 'Update Link' : 'Remove Link'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Admin Authentication Dialog */}
              <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Admin Authentication Required</DialogTitle>
                    <DialogDescription>
                      Please enter your admin token to publish RSS posts
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      type="password"
                      placeholder="Enter admin token..."
                      value={adminToken}
                      onChange={(e) => setAdminToken(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAuthSubmit()}
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowAuthDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAuthSubmit} disabled={!adminToken.trim()}>
                        Save Token
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </TabsContent>

            <TabsContent value="templates" className="p-6">
              <div className="grid gap-4">
                {POST_TEMPLATES.map(template => (
                  <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <h3 className="font-semibold">{template.name}</h3>
                          <p className="text-sm text-gray-600">
                            Category: {template.category} | Tags: {template.tags.join(", ")}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => applyTemplate(template)}
                        >
                          Use Template
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="preview" className="p-6">
              <div className="max-w-4xl mx-auto">
                <div className="bg-white border rounded-lg shadow-sm p-6 space-y-4">
                  <div className="border-b pb-4">
                    <h1 className="text-2xl font-bold text-gray-900">
                      {title || "Post Title"}
                    </h1>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <span>Published: {new Date().toLocaleDateString()}</span>
                      {category && <span>Category: {category}</span>}
                      {link && (
                        <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          View Original
                        </a>
                      )}
                    </div>
                    {tags.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="prose prose-sm max-w-none">
                    {editor ? (
                      <div dangerouslySetInnerHTML={{ __html: editor.getHTML() }} />
                    ) : (
                      <p className="text-gray-500">Start writing to see preview...</p>
                    )}
                  </div>
                  
                  {file && (
                    <div className="mt-4">
                      <img 
                        src={URL.createObjectURL(file)} 
                        alt="Upload preview" 
                        className="max-w-full h-auto rounded-lg border"
                      />
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="drafts" className="p-6">
              {drafts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No drafts saved yet</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {drafts.map(draft => (
                    <Card key={draft.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <h3 className="font-semibold">{draft.title}</h3>
                            <p className="text-sm text-gray-600">
                              {new Date(draft.updatedAt).toLocaleDateString()} | {draft.category}
                            </p>
                            {draft.tags.length > 0 && (
                              <div className="flex gap-1">
                                {draft.tags.map(tag => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => loadDraft(draft)}
                            >
                              Load
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteDraft(draft.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}