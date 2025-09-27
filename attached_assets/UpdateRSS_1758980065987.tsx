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
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken') || '');
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
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Card className="shadow-lg">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            RSS Content Manager
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="border-b px-6 py-2">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="compose">Compose</TabsTrigger>
                <TabsTrigger value="templates">Templates</TabsTrigger>
                <TabsTrigger value="drafts">Drafts ({drafts.length})</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="compose" className="p-6 space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title and metadata */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2">
                    <Label htmlFor="title" className="text-sm font-medium">Title</Label>
                    <Input
                      id="title"
                      type="text"
                      placeholder="Enter your post title..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="text-lg font-semibold"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category" className="text-sm font-medium">Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {POST_CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Rich text editor with toolbar */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Content</Label>
                  
                  {/* Editor toolbar */}
                  <div className="border rounded-t-lg p-2 flex flex-wrap items-center gap-1 bg-gray-50">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => editor.chain().focus().toggleBold().run()}
                      className={editor.isActive('bold') ? 'bg-gray-200' : ''}
                    >
                      <Bold className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => editor.chain().focus().toggleItalic().run()}
                      className={editor.isActive('italic') ? 'bg-gray-200' : ''}
                    >
                      <Italic className="h-4 w-4" />
                    </Button>
                    <Separator orientation="vertical" className="h-6" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => editor.chain().focus().toggleBulletList().run()}
                      className={editor.isActive('bulletList') ? 'bg-gray-200' : ''}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => editor.chain().focus().toggleOrderedList().run()}
                      className={editor.isActive('orderedList') ? 'bg-gray-200' : ''}
                    >
                      <ListOrdered className="h-4 w-4" />
                    </Button>
                    <Separator orientation="vertical" className="h-6" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleLinkClick}
                      className={editor.isActive('link') ? 'bg-gray-200' : ''}
                    >
                      <Link2 className="h-4 w-4" />
                    </Button>
                    <Separator orientation="vertical" className="h-6" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => editor.chain().focus().setTextAlign('left').run()}
                      className={editor.isActive({ textAlign: 'left' }) ? 'bg-gray-200' : ''}
                    >
                      <AlignLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => editor.chain().focus().setTextAlign('center').run()}
                      className={editor.isActive({ textAlign: 'center' }) ? 'bg-gray-200' : ''}
                    >
                      <AlignCenter className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => editor.chain().focus().setTextAlign('right').run()}
                      className={editor.isActive({ textAlign: 'right' }) ? 'bg-gray-200' : ''}
                    >
                      <AlignRight className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="border border-t-0 rounded-b-lg min-h-[300px] relative">
                    <EditorContent editor={editor} className="h-full" />
                    
                    {/* Smart suggestions - repositioned to avoid content overlap */}
                    {showSuggestions && suggestions.length > 0 && (
                      <div className="absolute bottom-2 right-2 bg-white border rounded-lg shadow-lg p-3 max-w-xs z-10">
                        <div className="flex items-center justify-between gap-2 mb-2 text-sm font-medium text-gray-600">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            Smart Suggestions
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
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
                            className="w-full text-left justify-start text-xs p-1 h-auto mb-1"
                            onClick={() => applySuggestion(suggestion)}
                          >
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Tags</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                        {tag} ×
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Add tag..."
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      className="flex-1"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addTag}>
                      <Tag className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Link and image */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="link" className="text-sm font-medium">Link (optional)</Label>
                    <Input
                      id="link"
                      type="url"
                      placeholder="https://example.com"
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="image" className="text-sm font-medium">Image (optional)</Label>
                    <Input
                      id="image"
                      type="file"
                      accept="image/jpeg,image/png,image/gif"
                      onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                    />
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={saveDraft}
                      disabled={isDraftSaving}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isDraftSaving ? "Saving..." : "Save Draft"}
                    </Button>
                  </div>
                  <Button type="submit" disabled={isPublishing}>
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

            <TabsContent value="preview" className="p-6">
              <Card>
                <CardHeader>
                  <CardTitle>{title || "Untitled Post"}</CardTitle>
                  <div className="flex gap-2 text-sm text-gray-600">
                    <span>Category: {category}</span>
                    {tags.length > 0 && <span>| Tags: {tags.join(", ")}</span>}
                  </div>
                </CardHeader>
                <CardContent>
                  <div 
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: editor?.getHTML() || "" }}
                  />
                  {link && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-gray-600">
                        Link: <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{link}</a>
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
