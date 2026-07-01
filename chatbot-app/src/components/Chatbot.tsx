import {
  useState, useRef, useEffect, useCallback, ChangeEvent, KeyboardEvent
} from 'react';
import {
  Send, Loader2, Sun, Moon, LogIn, LogOut, Settings, Paperclip,
  X, Trash2, Plus, Copy, Check, RefreshCw, Search, Menu, Clock,
  User, Bot, MessageSquare, Download, Trash, Sparkles, ChevronDown,
  FileText, Image, Upload, GripVertical, Pencil, CheckCheck,
  AlertCircle, Info, ChevronLeft, Star, Archive
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "framer-motion";

/* ============================================================
   TYPES
   ============================================================ */
type Message = {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: number;
  file?: AttachmentInfo;
  edited?: boolean;
};

type AttachmentInfo = {
  name: string;
  type: string;
  content: string;
  size: number;
};

type ChatSession = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
};

type Toast = {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
};

type Theme = 'light' | 'dark';
type View = 'chat' | 'settings' | 'search';

type AppState = {
  theme: Theme;
  apiKey: string;
  chats: ChatSession[];
  activeChatId: string | null;
  isLoggedIn: boolean;
  user: { name: string; email: string; avatar: string };
  settings: { exportOnDelete: boolean; streamResponse: boolean; enterToSend: boolean };
};

/* ============================================================
   CONSTANTS
   ============================================================ */
const STORAGE_KEY = 'chatbot-v42-state';
const DEFAULT_API_KEY = 'AIzaSyDK68voN4wRnCh95nrlu0m9vHbtJKOECqM';
const STREAM_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse';
const GENERATE_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const ALLOWED_FILE_TYPES = [
  'application/pdf', 'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword', 'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
];
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const SUGGESTED_PROMPTS = [
  'Summarize this document for me',
  'Write a professional email',
  'Explain quantum computing simply',
  'Help me debug my code',
  'Create a study plan',
  'Analyze the uploaded file',
];

/* ============================================================
   HELPERS
   ============================================================ */
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

function saveState(state: AppState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* quota */ }
}

function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppState;
  } catch { return null; }
}

function formatTime(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return time;
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`;
}

function formatFullTime(ts: number) {
  return new Date(ts).toLocaleString([], {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fileIcon(mime: string) {
  if (mime.startsWith('image/')) return Image;
  if (mime.includes('pdf')) return FileText;
  return Paperclip;
}

function truncate(str: string, n: number) {
  return str.length > n ? str.slice(0, n) + '…' : str;
}

/* ============================================================
   SIMPLE MARKDOWN RENDERER
   ============================================================ */
function renderMarkdown(text: string): (string | JSX.Element)[] {
  const lines = text.split('\n');
  const elements: (string | JSX.Element)[] = [];
  let codeBlockBuffer: string[] = [];
  let inCodeBlock = false;
  let codeLang = '';
  let keyCounter = 0;

  const flush = () => {
    if (codeBlockBuffer.length > 0) {
      const code = codeBlockBuffer.join('\n');
      elements.push(
        <CodeBlock key={`cb-${keyCounter++}`} code={code} language={codeLang} />
      );
      codeBlockBuffer = [];
      codeLang = '';
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const codeMatch = line.match(/^```(\w*)/);

    if (codeMatch) {
      if (inCodeBlock) { flush(); inCodeBlock = false; }
      else { flush(); inCodeBlock = true; codeLang = codeMatch[1]; }
      continue;
    }

    if (inCodeBlock) { codeBlockBuffer.push(line); continue; }

    let html = line;

    const hMatch = html.match(/^(#{1,6})\s+(.+)$/);
    if (hMatch) {
      const level = hMatch[1].length;
      const Tag = `h${level}` as keyof JSX.IntrinsicElements;
      elements.push(<Tag key={keyCounter++} className={`mt-3 mb-1 font-bold text-${level === 1 ? '2xl' : level === 2 ? 'xl' : level === 3 ? 'lg' : 'base'}`}>{renderInline(hMatch[2])}</Tag>);
      continue;
    }

    const bqMatch = html.match(/^>\s+(.+)$/);
    if (bqMatch) {
      elements.push(
        <blockquote key={keyCounter++} className="border-l-4 border-primary/40 pl-3 italic my-2 opacity-80">
          {renderInline(bqMatch[1])}
        </blockquote>
      );
      continue;
    }

    if (/^---+\s*$/.test(html)) {
      elements.push(<hr key={keyCounter++} className="my-3 border-border" />);
      continue;
    }

    const ulMatch = html.match(/^[-*+]\s+(.+)$/);
    if (ulMatch) {
      elements.push(
        <li key={keyCounter++} className="ml-5 list-disc my-0.5">
          {renderInline(ulMatch[1])}
        </li>
      );
      continue;
    }

    const olMatch = html.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      elements.push(
        <li key={keyCounter++} className="ml-5 list-decimal my-0.5">
          {renderInline(olMatch[1])}
        </li>
      );
      continue;
    }

    if (html.trim() === '') {
      elements.push(<div key={keyCounter++} className="h-2" />);
      continue;
    }

    elements.push(<p key={keyCounter++} className="my-1">{renderInline(html)}</p>);
  }

  flush();
  return elements;
}

function renderInline(text: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = [];
  let remaining = text;
  let idx = 0;

  const patterns: [RegExp, (m: RegExpExecArray) => JSX.Element][] = [
    [/`([^`]+)`/g, (m) => <code key={idx++} className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">{m[1]}</code>],
    [/\*\*([^*]+)\*\*/g, (m) => <strong key={idx++}>{m[1]}</strong>],
    [/\*([^*]+)\*/g, (m) => <em key={idx++}>{m[1]}</em>],
    [/\[([^\]]+)\]\(([^)]+)\)/g, (m) => <a key={idx++} href={m[2]} target="_blank" rel="noreferrer" className="underline text-primary">{m[1]}</a>],
    [/~~([^~]+)~~/g, (m) => <del key={idx++}>{m[1]}</del>],
  ];

  const segments: { start: number; end: number; el: JSX.Element }[] = [];

  for (const [regex, builder] of patterns) {
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(remaining)) !== null) {
      segments.push({ start: match.index, end: match.index + match[0].length, el: builder(match) });
    }
  }

  if (segments.length === 0) return [text];

  segments.sort((a, b) => a.start - b.start);

  const merged: typeof segments = [];
  for (const seg of segments) {
    if (merged.length > 0 && seg.start < merged[merged.length - 1].end) continue;
    merged.push(seg);
  }

  let cursor = 0;
  const result: (string | JSX.Element)[] = [];
  for (const seg of merged) {
    if (seg.start > cursor) result.push(remaining.slice(cursor, seg.start));
    result.push(seg.el);
    cursor = seg.end;
  }
  if (cursor < remaining.length) result.push(remaining.slice(cursor));

  return result.length === 0 ? [text] : result;
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className="relative group my-2 rounded-lg overflow-hidden border border-border">
      <div className="flex items-center justify-between bg-muted px-4 py-1.5 text-xs text-muted-foreground">
        <span>{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          {copied ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm bg-black/5 dark:bg-white/5">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/* ============================================================
   MESSAGE COMPONENT
   ============================================================ */
function MessageBubble({ message, onCopy, onDelete, onRegenerate, onEdit, isStreaming }: {
  message: Message;
  onCopy: (text: string) => void;
  onDelete: (id: string) => void;
  onRegenerate?: () => void;
  onEdit?: (id: string, newText: string) => void;
  isStreaming?: boolean;
}) {
  const [showActions, setShowActions] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const [copied, setCopied] = useState(false);
  const isUser = message.sender === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    onCopy(message.text);
  };

  const handleSaveEdit = () => {
    if (editText.trim() && editText !== message.text) {
      onEdit?.(message.id, editText);
    }
    setEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`max-w-[80%] lg:max-w-[65%] ${isUser ? 'order-1' : 'order-1'}`}>
        <div className={`flex items-center gap-2 mb-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
          <span className="text-xs text-muted-foreground">{formatTime(message.timestamp)}</span>
          {message.edited && <span className="text-xs text-muted-foreground">(edited)</span>}
        </div>

        <div className={`relative group rounded-2xl px-4 py-2.5 ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-card border border-border rounded-bl-sm shadow-sm'
        }`}>
          {message.file && (
            <div className={`flex items-center gap-2 mb-2 p-2 rounded-lg ${
              isUser ? 'bg-primary-foreground/10' : 'bg-muted/50'
            }`}>
              {message.file.type.startsWith('image/') ? (
                <img
                  src={`data:${message.file.type};base64,${message.file.content}`}
                  alt={message.file.name}
                  className="max-w-full rounded-lg max-h-48 object-contain"
                />
              ) : (
                <>
                  {(() => { const Icon = fileIcon(message.file!.type); return <Icon className="h-4 w-4 shrink-0" />; })()}
                  <span className="text-sm truncate">{message.file.name}</span>
                  <span className="text-xs opacity-60">({(message.file.size / 1024).toFixed(1)} KB)</span>
                </>
              )}
            </div>
          )}

          {editing ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full bg-background text-foreground rounded-lg p-2 text-sm resize-none border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                rows={3}
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit(); } }}
              />
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                <Button size="sm" onClick={handleSaveEdit}>Save</Button>
              </div>
            </div>
          ) : (
            <div className={`text-sm leading-relaxed ${isUser ? 'text-primary-foreground' : ''}`}>
              {isUser ? message.text : (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {renderMarkdown(message.text)}
                </div>
              )}
              {isStreaming && <span className="inline-block w-1.5 h-4 bg-primary ml-0.5 animate-pulse" />}
            </div>
          )}
        </div>

        {showActions && !editing && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-1 mt-1 ${isUser ? 'justify-end' : 'justify-start'}`}
          >
            <button onClick={handleCopy} className="p-1 rounded hover:bg-muted transition-colors" title="Copy">
              {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
            {isUser && (
              <button onClick={() => { setEditing(true); setEditText(message.text); }} className="p-1 rounded hover:bg-muted transition-colors" title="Edit">
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
            {!isUser && onRegenerate && (
              <button onClick={onRegenerate} className="p-1 rounded hover:bg-muted transition-colors" title="Regenerate">
                <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
            <button onClick={() => onDelete(message.id)} className="p-1 rounded hover:bg-muted transition-colors" title="Delete">
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" />
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

/* ============================================================
   MAIN CHATBOT COMPONENT
   ============================================================ */
export default function Chatbot() {
  /* ---------- STATE ---------- */
  const [theme, setTheme] = useState<Theme>('light');
  const [view, setView] = useState<View>('chat');
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [selectedFile, setSelectedFile] = useState<AttachmentInfo | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [apiKey, setApiKey] = useState(DEFAULT_API_KEY);
  const [showApiKey, setShowApiKey] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [enterToSend, setEnterToSend] = useState(true);
  const [showProfile, setShowProfile] = useState(false);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState({ name: 'Guest', email: '', avatar: '' });
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* ---------- DERIVED ---------- */
  const activeChat = chats.find(c => c.id === activeChatId) || null;
  const filteredChats = searchQuery
    ? chats.filter(c =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.messages.some(m => m.text.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : chats;

  /* ---------- INIT ---------- */
  useEffect(() => {
    const saved = loadState();
    if (saved) {
      setTheme(saved.theme);
      setApiKey(saved.apiKey);
      setIsLoggedIn(saved.isLoggedIn);
      setUser(saved.user);
      setEnterToSend(saved.settings.enterToSend);
      if (saved.chats.length > 0) {
        setChats(saved.chats);
        setActiveChatId(saved.activeChatId || saved.chats[0].id);
      } else {
        createNewChatInternal();
      }
    } else {
      createNewChatInternal();
    }
  }, []);

  useEffect(() => {
    if (chats.length > 0) {
      const state: AppState = {
        theme, apiKey, chats, activeChatId,
        isLoggedIn, user,
        settings: { exportOnDelete: false, streamResponse: true, enterToSend },
      };
      saveState(state);
    }
  }, [chats, activeChatId, theme, apiKey, isLoggedIn, user, enterToSend]);

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat?.messages, streamingText]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSidebarOpen(false);
        setSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setSidebarOpen(false);
      }
    };
    if (sidebarOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [sidebarOpen]);

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = uid();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  /* ---------- CHAT MANAGEMENT ---------- */
  const createNewChatInternal = useCallback((title?: string) => {
    const newChat: ChatSession = {
      id: uid(),
      title: title || 'New Chat',
      messages: [{
        id: uid(),
        text: title
          ? `Hello! I'm ready to help with "${title}". What would you like to know?`
          : 'Hello! I am your AI assistant powered by Gemini. How can I help you today?',
        sender: 'bot',
        timestamp: Date.now(),
      }],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    return newChat;
  }, []);

  const createNewChat = () => createNewChatInternal();

  const deleteChat = useCallback((id: string) => {
    setChats(prev => {
      const next = prev.filter(c => c.id !== id);
      if (next.length === 0) {
        const fresh = {
          id: uid(),
          title: 'New Chat',
          messages: [{
            id: uid(),
            text: 'Hello! I am your AI assistant powered by Gemini. How can I help you today?',
            sender: 'bot',
            timestamp: Date.now(),
          }],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setActiveChatId(fresh.id);
        return [fresh];
      }
      if (activeChatId === id) setActiveChatId(next[0].id);
      return next;
    });
  }, [activeChatId]);

  const clearAllChats = useCallback(() => {
    const fresh = {
      id: uid(),
      title: 'New Chat',
      messages: [{
        id: uid(),
        text: 'Hello! I am your AI assistant powered by Gemini. How can I help you today?',
        sender: 'bot',
        timestamp: Date.now(),
      }],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setChats([fresh]);
    setActiveChatId(fresh.id);
    addToast('All chats cleared', 'info');
  }, [addToast]);

  const togglePinChat = useCallback((id: string) => {
    setChats(prev => prev.map(c =>
      c.id === id ? { ...c, pinned: !c.pinned } : c
    ));
  }, []);

  /* ---------- MESSAGE MANAGEMENT ---------- */
  const updateMessages = useCallback((chatId: string, updater: (msgs: Message[]) => Message[]) => {
    setChats(prev => prev.map(c =>
      c.id === chatId ? { ...c, messages: updater(c.messages), updatedAt: Date.now() } : c
    ));
  }, []);

  const deleteMessage = useCallback((msgId: string) => {
    if (!activeChatId) return;
    updateMessages(activeChatId, msgs => msgs.filter(m => m.id !== msgId));
  }, [activeChatId, updateMessages]);

  const editMessage = useCallback((msgId: string, newText: string) => {
    if (!activeChatId) return;
    updateMessages(activeChatId, msgs => msgs.map(m =>
      m.id === msgId ? { ...m, text: newText, edited: true } : m
    ));
  }, [activeChatId, updateMessages]);

  const copyMessage = useCallback((_text: string) => {
    addToast('Copied to clipboard', 'success');
  }, [addToast]);

  /* ---------- FILE HANDLING ---------- */
  const processFile = useCallback((file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      addToast(`File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`, 'error');
      return false;
    }
    const isImage = file.type.startsWith('image/');
    if (!isImage && !ALLOWED_FILE_TYPES.includes(file.type)) {
      addToast('Unsupported file type', 'error');
      return false;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const full = e.target?.result as string;
      setSelectedFile({
        name: file.name,
        type: file.type,
        content: full.split(',')[1],
        size: file.size,
      });
    };
    reader.readAsDataURL(file);
    return true;
  }, [addToast]);

  const handleFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  }, [processFile]);

  const removeFile = useCallback(() => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  /* ---------- DRAG & DROP ---------- */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  /* ---------- GEMINI API ---------- */
  const callGemini = useCallback(async (
    messages: Message[],
    signal?: AbortSignal,
    onToken?: (token: string) => void,
  ): Promise<string> => {
    const contents = messages.map(m => ({
      role: m.sender === 'user' ? 'user' : 'model',
      parts: (() => {
        const parts: any[] = [{ text: m.text }];
        if (m.file) {
          parts.push({ inlineData: { mimeType: m.file.type, data: m.file.content } });
        }
        return parts;
      })(),
    }));

    const body = JSON.stringify({ contents });

    if (onToken) {
      try {
        const url = `${STREAM_URL}&key=${apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const reader = res.body?.getReader();
        if (!reader) throw new Error('No reader');
        const decoder = new TextDecoder();
        let fullText = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const json = JSON.parse(line.slice(6));
                const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                  fullText += text;
                  onToken(fullText);
                }
              } catch { /* partial parse ok */ }
            }
          }
        }
        return fullText || "I couldn't generate a response.";
      } catch (err: any) {
        if (err.name === 'AbortError') throw err;
      }
    }

    const url = `${GENERATE_URL}?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal,
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate a response.";
  }, [apiKey]);

  /* ---------- SEND MESSAGE ---------- */
  const handleSend = useCallback(async (promptOverride?: string) => {
    const text = (promptOverride || inputValue).trim();
    if (!text && !selectedFile) return;

    if (!activeChatId) createNewChatInternal();
    const chatId = activeChatId || chats[0]?.id;
    if (!chatId) return;

    const userMsg: Message = {
      id: uid(),
      text: text,
      sender: 'user',
      timestamp: Date.now(),
      ...(selectedFile ? { file: selectedFile } : {}),
    };

    const isFirstMessage = activeChat?.messages.length === 1;
    const title = isFirstMessage ? truncate(text || 'File upload', 35) : undefined;

    setInputValue('');
    setSelectedFile(null);
    setIsStreaming(true);
    setStreamingText('');

    updateMessages(chatId, msgs => [...msgs, userMsg]);

    if (title) {
      setChats(prev => prev.map(c =>
        c.id === chatId ? { ...c, title } : c
      ));
    }

    const updatedChat = chats.find(c => c.id === chatId);
    const contextMessages = updatedChat
      ? [...updatedChat.messages, userMsg]
      : [userMsg];

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      let botText = '';

      await callGemini(contextMessages, abort.signal, (full) => {
        botText = full;
        setStreamingText(full);
      });

      const botMsg: Message = {
        id: uid(),
        text: botText,
        sender: 'bot',
        timestamp: Date.now(),
      };

      updateMessages(chatId, msgs => [...msgs, botMsg]);
      setStreamingText('');
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Gemini error:', err);
      const errMsg: Message = {
        id: uid(),
        text: `Sorry, I encountered an error: ${err.message || 'Please try again.'}`,
        sender: 'bot',
        timestamp: Date.now(),
      };
      updateMessages(chatId, msgs => [...msgs, errMsg]);
      addToast('Failed to get response', 'error');
    } finally {
      setIsStreaming(false);
      setStreamingText('');
      abortRef.current = null;
    }
  }, [inputValue, selectedFile, activeChatId, activeChat, chats, createNewChatInternal, updateMessages, callGemini, addToast]);

  /* ---------- REGENERATE ---------- */
  const handleRegenerate = useCallback(async () => {
    if (!activeChatId || !activeChat || activeChat.messages.length < 2) return;

    const msgs = activeChat.messages.slice(0, -1);
    const lastUserMsg = msgs[msgs.length - 1];

    updateMessages(activeChatId, () => msgs);
    setIsStreaming(true);
    setStreamingText('');

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      let botText = '';
      await callGemini(msgs, abort.signal, (full) => {
        botText = full;
        setStreamingText(full);
      });

      const botMsg: Message = {
        id: uid(),
        text: botText,
        sender: 'bot',
        timestamp: Date.now(),
      };

      updateMessages(activeChatId, msgs2 => [...msgs2, botMsg]);
      setStreamingText('');
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      const errMsg: Message = {
        id: uid(),
        text: 'Sorry, I encountered an error during regeneration. Please try again.',
        sender: 'bot',
        timestamp: Date.now(),
      };
      updateMessages(activeChatId, msgs2 => [...msgs2, errMsg]);
    } finally {
      setIsStreaming(false);
      setStreamingText('');
      abortRef.current = null;
    }
  }, [activeChatId, activeChat, updateMessages, callGemini]);

  /* ---------- STOP STREAMING ---------- */
  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    if (activeChatId && streamingText) {
      const botMsg: Message = {
        id: uid(),
        text: streamingText + '\n\n*(response truncated)*',
        sender: 'bot',
        timestamp: Date.now(),
      };
      updateMessages(activeChatId, msgs => [...msgs, botMsg]);
      setStreamingText('');
      setIsStreaming(false);
    }
  }, [activeChatId, streamingText, updateMessages]);

  /* ---------- KEY HANDLER ---------- */
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (enterToSend && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      } else if (!enterToSend && e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    }
  }, [enterToSend, handleSend]);

  /* ---------- AUTH ---------- */
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    setTimeout(() => {
      if (loginEmail === 'Admin@girish.com' && loginPassword === '@Girish111') {
        setIsLoggedIn(true);
        setUser({ name: 'Girish', email: 'Admin@girish.com', avatar: 'https://github.com/shadcn.png' });
        setShowLoginForm(false);
        addToast('Logged in successfully', 'success');
      } else {
        setAuthError('Invalid email or password');
      }
      setAuthLoading(false);
    }, 800);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser({ name: 'Guest', email: '', avatar: '' });
    setShowProfile(false);
    addToast('Logged out', 'info');
  };

  /* ---------- EXPORT ---------- */
  const exportChats = useCallback(() => {
    const blob = new Blob([JSON.stringify(chats, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chatbot-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Chats exported successfully', 'success');
  }, [chats, addToast]);

  /* ---------- IMPORT ---------- */
  const importChats = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const imported = JSON.parse(ev.target?.result as string) as ChatSession[];
          if (Array.isArray(imported)) {
            setChats(prev => [...imported, ...prev]);
            setActiveChatId(imported[0].id);
            addToast(`Imported ${imported.length} chats`, 'success');
          }
        } catch {
          addToast('Invalid export file', 'error');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [addToast]);

  /* ---------- SETTINGS ---------- */
  const SettingsPanel = () => (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className={`fixed inset-0 z-50 flex`}
    >
      <div className="absolute inset-0 bg-black/20" onClick={() => setSettingsOpen(false)} />
      <div className={`relative ml-auto w-full max-w-md h-full ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} shadow-2xl overflow-y-auto`}>
        <div className={`sticky top-0 z-10 flex items-center justify-between p-4 border-b ${theme === 'dark' ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(false)}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-lg font-semibold">Settings</h2>
          </div>
        </div>

        <div className="p-4 space-y-6">
          <section>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Appearance</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Theme</Label>
                <div className="flex gap-2">
                  <Button
                    variant={theme === 'light' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('light')}
                    className="gap-2"
                  >
                    <Sun className="h-4 w-4" /> Light
                  </Button>
                  <Button
                    variant={theme === 'dark' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('dark')}
                    className="gap-2"
                  >
                    <Moon className="h-4 w-4" /> Dark
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Behavior</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enter to send</Label>
                  <p className="text-xs text-muted-foreground">Shift+Enter for new line</p>
                </div>
                <Button
                  variant={enterToSend ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setEnterToSend(!enterToSend)}
                >
                  {enterToSend ? 'On' : 'Off'}
                </Button>
              </div>
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">API Key</h3>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter Gemini API key"
                  className="flex-1"
                />
                <Button variant="outline" size="icon" onClick={() => setShowApiKey(!showApiKey)}>
                  {showApiKey ? 'Hide' : 'Show'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Get your API key from <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="underline">Google AI Studio</a>
              </p>
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Data</h3>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start gap-2" onClick={exportChats}>
                <Download className="h-4 w-4" /> Export All Chats
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" onClick={importChats}>
                <Upload className="h-4 w-4" /> Import Chats
              </Button>
              <Button variant="destructive" className="w-full justify-start gap-2" onClick={clearAllChats}>
                <Trash className="h-4 w-4" /> Clear All History
              </Button>
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">About</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Chatbot V42 — Full-Fledged Edition</p>
              <p>Powered by Google Gemini 2.0 Flash</p>
              <p className="text-xs">All data stored locally in your browser.</p>
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  );

  /* ---------- RENDER ---------- */
  return (
    <div
      className={`flex h-screen ${theme === 'dark' ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900'} transition-colors duration-200`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        accept=".pdf,.txt,.doc,.docx,.csv,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp"
      />

      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          >
            <div className={`p-12 rounded-2xl border-2 border-dashed ${theme === 'dark' ? 'border-primary border-opacity-50' : 'border-primary'} bg-card shadow-2xl`}>
              <Upload className="h-12 w-12 mx-auto mb-4 text-primary" />
              <p className="text-lg font-medium">Drop file here</p>
              <p className="text-sm text-muted-foreground">PDF, images, documents up to 15MB</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className={`pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium ${
                t.type === 'success' ? 'bg-green-600 text-white' :
                t.type === 'error' ? 'bg-red-600 text-white' :
                'bg-primary text-primary-foreground'
              }`}
            >
              {t.type === 'success' ? <CheckCheck className="h-4 w-4" /> :
               t.type === 'error' ? <AlertCircle className="h-4 w-4" /> :
               <Info className="h-4 w-4" />}
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className={`fixed top-0 left-0 right-0 z-30 flex items-center justify-between p-3 border-b md:hidden ${
        theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="font-semibold truncate">{activeChat?.title || 'Chatbot'}</h1>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => setSearchQuery(prev => prev ? '' : ' ')}>
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {(sidebarOpen || window.innerWidth >= 768) && (
          <motion.div
            ref={sidebarRef}
            initial={window.innerWidth < 768 ? { x: -300, opacity: 0 } : false}
            animate={window.innerWidth < 768 ? { x: 0, opacity: 1 } : undefined}
            exit={window.innerWidth < 768 ? { x: -300, opacity: 0 } : undefined}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`${
              window.innerWidth < 768
                ? 'fixed left-0 top-0 bottom-0 z-40 shadow-2xl'
                : 'relative'
            } w-72 flex flex-col ${
              theme === 'dark' ? 'bg-gray-900 border-r border-gray-800' : 'bg-white border-r border-gray-200'
            }`}
          >
            <div className={`p-3 border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <h1 className="font-bold text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Chatbot
                </h1>
                {window.innerWidth < 768 && (
                  <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={createNewChat} className="flex-1 gap-2" size="sm">
                  <Plus className="h-4 w-4" /> New Chat
                </Button>
                <Button variant="outline" size="icon" onClick={() => setSettingsOpen(true)}>
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className={`p-3 border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search chats..."
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              <AnimatePresence>
                {filteredChats.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No chats found</p>
                  </div>
                ) : (
                  [...filteredChats]
                    .sort((a, b) => {
                      if (a.pinned && !b.pinned) return -1;
                      if (!a.pinned && b.pinned) return 1;
                      return b.updatedAt - a.updatedAt;
                    })
                    .map(chat => (
                      <motion.div
                        key={chat.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`group flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all ${
                          activeChatId === chat.id
                            ? theme === 'dark' ? 'bg-gray-800 shadow-sm' : 'bg-primary/10 shadow-sm'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => { setActiveChatId(chat.id); if (window.innerWidth < 768) setSidebarOpen(false); }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {chat.pinned && <Star className="h-3 w-3 text-yellow-500 shrink-0" />}
                            <p className="text-sm font-medium truncate">{chat.title}</p>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {chat.messages[chat.messages.length - 1]?.text.slice(0, 40) || 'No messages'}
                          </p>
                        </div>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); togglePinChat(chat.id); }}
                            className="p-1 rounded hover:bg-muted"
                          >
                            <Star className={`h-3.5 w-3.5 ${chat.pinned ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                            className="p-1 rounded hover:bg-muted"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" />
                          </button>
                        </div>
                      </motion.div>
                    ))
                )}
              </AnimatePresence>
            </div>

            <div className={`p-3 border-t ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2"
                onClick={() => setShowProfile(!showProfile)}
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback className="text-xs">{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="text-left flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{user.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{user.email || 'Not logged in'}</div>
                </div>
              </Button>

              <AnimatePresence>
                {showProfile && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className={`mt-2 rounded-lg p-2 space-y-1 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
                      {!isLoggedIn ? (
                        showLoginForm ? (
                          <form onSubmit={handleLogin} className="space-y-2 p-1">
                            <Input
                              type="email"
                              value={loginEmail}
                              onChange={(e) => setLoginEmail(e.target.value)}
                              placeholder="Email"
                              className="h-8 text-sm"
                              required
                            />
                            <Input
                              type="password"
                              value={loginPassword}
                              onChange={(e) => setLoginPassword(e.target.value)}
                              placeholder="Password"
                              className="h-8 text-sm"
                              required
                            />
                            {authError && <p className="text-xs text-red-500">{authError}</p>}
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="remember"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="rounded"
                              />
                              <Label htmlFor="remember" className="text-xs">Remember me</Label>
                            </div>
                            <div className="flex gap-2">
                              <Button type="submit" size="sm" className="flex-1" disabled={authLoading}>
                                {authLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Login'}
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => setShowLoginForm(false)}>Cancel</Button>
                            </div>
                          </form>
                        ) : (
                          <Button variant="ghost" className="w-full justify-start gap-2 h-8 text-sm" onClick={() => setShowLoginForm(true)}>
                            <LogIn className="h-4 w-4" /> Login
                          </Button>
                        )
                      ) : (
                        <>
                          <Button variant="destructive" className="w-full justify-start gap-2 h-8 text-sm" onClick={handleLogout}>
                            <LogOut className="h-4 w-4" /> Logout
                          </Button>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`flex-1 flex flex-col min-w-0 ${window.innerWidth < 768 ? 'pt-14' : ''}`}>
        <Card className={`flex-1 mx-2 my-2 md:mx-4 md:my-4 flex flex-col overflow-hidden ${
          theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
        }`}>
          <CardHeader className={`py-3 px-4 border-b shrink-0 ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base truncate">{activeChat?.title || 'Chatbot'}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {activeChat ? `${activeChat.messages.length} messages` : 'Start a conversation'}
                    {isStreaming && ' • Streaming...'}
                  </p>
                </div>
              </div>

              <div className="hidden md:flex items-center gap-2">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Gemini 2.0 Flash
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent
            className="flex-1 overflow-y-auto p-4 space-y-1 scroll-smooth"
            ref={messagesEndRef as any}
          >
            {!activeChat ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <MessageSquare className="h-16 w-16 mb-4 opacity-20" />
                <p className="text-lg font-medium">Select or start a chat</p>
                <p className="text-sm">Create a new conversation to begin</p>
              </div>
            ) : activeChat.messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Bot className="h-16 w-16 mb-4 opacity-20" />
                <p className="text-lg font-medium">Start a conversation</p>
                <p className="text-sm mb-6">Type a message or upload a file to begin</p>
                <div className="flex flex-wrap gap-2 max-w-md justify-center">
                  {SUGGESTED_PROMPTS.map((prompt, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => { setInputValue(prompt); inputRef.current?.focus(); }}
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {activeChat.messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    onCopy={copyMessage}
                    onDelete={deleteMessage}
                    onRegenerate={
                      msg.sender === 'bot' && msg === activeChat.messages[activeChat.messages.length - 1] && !isStreaming
                        ? handleRegenerate
                        : undefined
                    }
                    onEdit={editMessage}
                  />
                ))}

                {isStreaming && streamingText && (
                  <MessageBubble
                    message={{
                      id: 'streaming',
                      text: streamingText,
                      sender: 'bot',
                      timestamp: Date.now(),
                    }}
                    onCopy={copyMessage}
                    onDelete={() => {}}
                    isStreaming
                  />
                )}

                {isStreaming && !streamingText && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start mb-3"
                  >
                    <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                      <div className="flex gap-1.5">
                        <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0 }} className="h-2 w-2 bg-primary rounded-full" />
                        <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }} className="h-2 w-2 bg-primary rounded-full" />
                        <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }} className="h-2 w-2 bg-primary rounded-full" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </>
            )}

            <div ref={messagesEndRef} />
          </CardContent>

          <CardFooter className={`border-t shrink-0 p-3 ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
            <div className="flex flex-col w-full gap-2">
              <AnimatePresence>
                {selectedFile && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                      theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {selectedFile.type.startsWith('image/') ? (
                        <img
                          src={`data:${selectedFile.type};base64,${selectedFile.content}`}
                          alt="preview"
                          className="h-8 w-8 rounded object-cover"
                        />
                      ) : (
                        (() => { const Icon = fileIcon(selectedFile.type); return <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />; })()
                      )}
                      <span className="text-sm truncate max-w-[200px]">{selectedFile.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(selectedFile.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={removeFile}>
                      <X className="h-4 w-4" />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-end gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isStreaming}
                  className="shrink-0 h-10 w-10"
                  title="Attach file"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>

                <div className="flex-1 relative">
                  <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isStreaming ? 'Waiting for response...' : 'Type a message... (Enter to send)'}
                    disabled={isStreaming}
                    className="pr-16 h-10"
                  />
                  {inputValue.length > 0 && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      {inputValue.length}
                    </span>
                  )}
                </div>

                {isStreaming ? (
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={stopStreaming}
                    className="shrink-0 h-10 w-10"
                    title="Stop generating"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleSend()}
                    disabled={!inputValue.trim() && !selectedFile}
                    size="icon"
                    className="shrink-0 h-10 w-10"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Powered by Google Gemini 2.0 Flash. Responses are AI-generated.
              </p>
            </div>
          </CardFooter>
        </Card>
      </div>

      <AnimatePresence>
        {settingsOpen && <SettingsPanel />}
      </AnimatePresence>
    </div>
  );
}
