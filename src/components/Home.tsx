import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Upload, FileText, Image as ImageIcon, History, Settings, LogOut, 
  Send, User as UserIcon, Shield, ArrowRight, Check, RefreshCw, X, AlertCircle
} from 'lucide-react';
import { User, AIHistoryItem } from '../types';
import { API_BASE_URL, apiFetch } from '../config';

interface HomeProps {
  user: User;
  isAdmin: boolean;
  onLogout: () => void;
  onUpgradePrompt: () => void;
}

export default function Home({ user, isAdmin, onLogout, onUpgradePrompt }: HomeProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'assistant' | 'history' | 'settings'>('assistant');
  
  // AI query inputs
  const [promptText, setPromptText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'photo' | 'text_file' | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);

  // AI responses
  const [loading, setLoading] = useState(false);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [uploadsRemaining, setUploadsRemaining] = useState<number>(20);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);

  // Auto-close liquid glass notification after 8 seconds
  useEffect(() => {
    if (showSuccessNotification) {
      const timer = setTimeout(() => {
        setShowSuccessNotification(false);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessNotification]);

  // Settings modals
  const [settingsSection, setSettingsSection] = useState<'profile' | 'privacy' | 'about'>('profile');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => localStorage.getItem('isDarkMode') === 'true');

  useEffect(() => {
    localStorage.setItem('isDarkMode', isDarkMode.toString());
  }, [isDarkMode]);

  // History stores
  const [chatHistory, setChatHistory] = useState<AIHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<AIHistoryItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  // Fetch updated status to check limit remaining
  const fetchUserStatus = async () => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/user/status?gmail=${encodeURIComponent(user.gmail)}`);
      if (res.ok) {
        const data = await res.json();
        setUploadsRemaining(data.remaining);
      }
    } catch (err) {
      console.error('Error fetching status', err);
    }
  };

  // Fetch past interaction history
  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/user/history?gmail=${encodeURIComponent(user.gmail)}`);
      if (res.ok) {
        const data = await res.json();
        setChatHistory(data);
      }
    } catch (err) {
      console.error('Error fetching history', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchUserStatus();
    fetchHistory();
  }, [user.gmail]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError('');

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (selectedFile: File) => {
    const isImage = selectedFile.type.startsWith('image/');
    const isText = selectedFile.type === 'text/plain' || selectedFile.name.endsWith('.txt');

    if (!isImage && !isText) {
      setError('Only image files (JPEG/PNG) or plain text document files (.txt) are supported.');
      return;
    }

    setFile(selectedFile);
    setFileType(isImage ? 'photo' : 'text_file');

    const reader = new FileReader();
    
    if (isImage) {
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setFilePreview(dataUrl);
        const base64 = dataUrl.split(',')[1];
        setFileBase64(base64);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      reader.onload = () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = window.btoa(binary);
        setFileBase64(base64);
        setFilePreview(null);
      };
      reader.readAsArrayBuffer(selectedFile);
    }
  };

  const clearFileSelection = () => {
    setFile(null);
    setFilePreview(null);
    setFileType(null);
    setFileBase64(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const renderFormattedResponse = (rawText: string) => {
    if (!rawText) return null;
    const paragraphs = rawText.split('\n\n');
    
    return paragraphs.map((para, pIndex) => {
      if (para.trim().startsWith('* ') || para.trim().startsWith('- ')) {
        const items = para.split(/\n[\?\*\-\+]\s+/);
        return (
          <ul key={pIndex} className="list-disc pl-5 my-3 space-y-2 text-slate-800 text-sm font-sans">
            {items.map((item, iIndex) => {
              const cleanItem = item.replace(/^[\*\-\+]\s+/, '').trim();
              return <li key={iIndex}>{parseBoldText(cleanItem)}</li>;
            })}
          </ul>
        );
      }

      if (/^\d+\.\s+/.test(para.trim())) {
        const items = para.split(/\n\d+\.\s+/);
        return (
          <ol key={pIndex} className="list-decimal pl-5 my-3 space-y-2 text-slate-800 text-sm font-sans">
            {items.map((item, iIndex) => {
              const cleanItem = item.replace(/^\d+\.\s+/, '').trim();
              return <li key={iIndex}>{parseBoldText(cleanItem)}</li>;
            })}
          </ol>
        );
      }

      return (
        <p key={pIndex} className="text-slate-800 text-sm md:text-base leading-relaxed my-3 font-sans">
          {parseBoldText(para)}
        </p>
      );
    });
  };

  const parseBoldText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="text-blue-700 font-extrabold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const handleAskHanova = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setAiAnswer(null);

    const isFree = user.plan === 'Free';

    if (!promptText.trim() && !fileBase64) {
      setError('Please enter a query prompt or select a file to upload.');
      return;
    }

    if (isFree && uploadsRemaining <= 0) {
      setError('You have reached your limit of 20 queries/uploads for today on the Free plan. Upgrade to Premium for infinite student assistance!');
      return;
    }

    setLoading(true);

    try {
      const askType = fileType ? fileType : 'direct_text';
      
      const payload = {
        gmail: user.gmail,
        type: askType,
        promptText: promptText,
        fileData: fileBase64,
        fileName: file ? file.name : undefined,
        fileMimeType: file ? file.type : undefined
      };

      const res = await apiFetch(`${API_BASE_URL}/api/ai/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      let data: any = {};
      const responseText = await res.text();
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (e) {
        if (!res.ok) {
          throw new Error(`Server returned error status ${res.status}: ${responseText || 'Empty response'}`);
        }
        throw new Error('Received invalid response from server.');
      }

      if (!res.ok) {
        throw new Error(data.error || 'Server error occurred.');
      }

      setAiAnswer(data.answer);
      setShowSuccessNotification(true);
      if (isFree) {
        setUploadsRemaining(data.uploadsRemaining);
      }

      fetchHistory();
      setPromptText('');
      clearFileSelection();

    } catch (err: any) {
      setError(err?.message || 'Failed to submit query to the server.');
    } finally {
      setLoading(false);
    }
  };

  const loadFromHistory = (item: AIHistoryItem) => {
    setSelectedHistoryItem(item);
    setActiveTab('assistant');
    setAiAnswer(item.response);
  };

  return (
    <div className={`min-h-screen flex overflow-hidden border-8 transition-colors duration-250 relative ${
      isDarkMode ? 'bg-[#0B0F19] border-slate-950 text-slate-100' : 'bg-white border-slate-100 text-[#0f172a]'
    }`}>
      
      {/* SIDEBAR: NAVIGATION & IDENTITY */}
      <aside className={`w-68 border-r flex flex-col p-6 shrink-0 hidden md:flex transition-colors duration-250 ${
        isDarkMode ? 'bg-[#0F131E]/95 border-slate-800' : 'bg-slate-50 border-slate-200'
      }`}>
        {/* Brand Label */}
        <div className="mb-10">
          <h1 className={`text-4xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>HANOVA</h1>
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400 mt-1 italic">Modern Intelligent Utility</p>
        </div>
        
        {/* Links Navigation */}
        <nav className="flex-1 space-y-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('assistant');
              setSelectedHistoryItem(null);
            }}
            className={`w-full group flex items-center gap-3.5 p-3.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'assistant' 
                ? isDarkMode ? 'bg-blue-600 text-white font-semibold shadow-md' : 'bg-slate-900 text-white font-semibold shadow-sm' 
                : isDarkMode 
                  ? 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 font-medium' 
                  : 'text-slate-505 hover:bg-slate-200 text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <div className={`w-5 h-5 border-2 rounded-sm flex items-center justify-center ${
              activeTab === 'assistant' 
                ? 'border-white bg-white text-slate-900' 
                : isDarkMode ? 'border-slate-700 text-slate-400' : 'border-slate-300'
            }`}>
              <Sparkles className="h-3 w-3" />
            </div>
            <span>Home Hub</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`w-full group flex items-center gap-3.5 p-3.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'history' 
                ? isDarkMode ? 'bg-blue-600 text-white font-semibold shadow-md' : 'bg-slate-900 text-white font-semibold shadow-sm' 
                : isDarkMode 
                  ? 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 font-medium' 
                  : 'text-slate-505 hover:bg-slate-200 text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <div className={`w-5 h-5 border-2 rounded-sm flex items-center justify-center ${
              activeTab === 'history' 
                ? 'border-white bg-white text-slate-900' 
                : isDarkMode ? 'border-slate-700 text-slate-400' : 'border-slate-300'
            }`}>
              <History className="h-3 w-3" />
            </div>
            <span>History logs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`w-full group flex items-center gap-3.5 p-3.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'settings' 
                ? isDarkMode ? 'bg-blue-600 text-white font-semibold shadow-md' : 'bg-slate-900 text-white font-semibold shadow-sm' 
                : isDarkMode 
                  ? 'text-slate-400 hover:bg-[#1E293B]/60 hover:text-slate-200 font-medium' 
                  : 'text-slate-555 hover:bg-slate-200 text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <div className={`w-5 h-5 border-2 rounded-sm flex items-center justify-center ${
              activeTab === 'settings' 
                ? 'border-white bg-white text-slate-900' 
                : isDarkMode ? 'border-slate-700 text-slate-400' : 'border-slate-300'
            }`}>
              <Settings className="h-3 w-3" />
            </div>
            <span>Settings</span>
          </button>
        </nav>

        {/* User profile footer card in sidebar */}
        <div className={`mt-auto p-4 border rounded-2xl shadow-sm transition-colors duration-250 ${
          isDarkMode ? 'bg-[#182235] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 shrink-0 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold uppercase">
              {user.name.slice(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-xs font-black truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{user.name}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{user.plan} Active</p>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-mono truncate">{user.gmail}</p>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className={`flex-1 flex flex-col p-6 md:p-8 overflow-y-auto transition-colors duration-250 ${
        isDarkMode ? 'bg-[#0B0F19]' : 'bg-[#FAFAFA]'
      }`}>
        
        {/* Desktop header with big typography */}
        <header className={`flex flex-col sm:flex-row justify-between items-start gap-4 mb-8 pb-6 border-b transition-colors duration-250 ${
          isDarkMode ? 'border-slate-800' : 'border-slate-200/60'
        }`}>
          <div>
            <h2 className={`text-4xl md:text-5xl font-black tracking-tight leading-none mb-1 uppercase ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              {activeTab === 'assistant' ? 'System Hub.' : activeTab === 'history' ? 'History Logs.' : 'Setup & Panel.'}
            </h2>
            <p className="text-slate-500 text-xs md:text-sm font-medium">
              We leverage premium AI logic to analyze visual files and text outputs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Upgrade banner tag */}
            <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-xs font-bold border border-blue-100 flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              <span>
                {user.plan === 'Free' 
                  ? `Free Plan: ${Math.max(0, 20 - uploadsRemaining)}/20 Uploads Remaining` 
                  : 'Premium Access Unlocked'
                }
              </span>
            </div>

            {user.plan === 'Free' && (
              <button
                type="button"
                onClick={onUpgradePrompt}
                className="bg-slate-900 hover:bg-blue-600 text-white px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider shadow-sm transition-all"
              >
                Upgrade Now
              </button>
            )}

            <button
              type="button"
              onClick={onLogout}
              className="p-2 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-full transition-all border border-slate-200 bg-white shadow-sm sm:hidden"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Mobile Tab bar - only visible on mobile screen sizes */}
        <div className="flex gap-2 mb-6 md:hidden">
          <button
            type="button"
            onClick={() => {
              setActiveTab('assistant');
              setSelectedHistoryItem(null);
            }}
            className={`flex-1 py-2 text-center text-xs font-black uppercase tracking-wider rounded-xl border ${
              activeTab === 'assistant' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200'
            }`}
          >
            Hub
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 text-center text-xs font-black uppercase tracking-wider rounded-xl border ${
              activeTab === 'history' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200'
            }`}
          >
            History
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-2 text-center text-xs font-black uppercase tracking-wider rounded-xl border ${
              activeTab === 'settings' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200'
            }`}
          >
            Config
          </button>
        </div>

        {/* Tab display container */}
        <div className="flex-1 flex flex-col">
          <AnimatePresence mode="wait">
            {activeTab === 'assistant' && (
              <motion.div
                key="assistant-tab"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-stretch"
              >
                
                {/* Left: Assistant interaction output screen (7 cols) */}
                <div className="lg:col-span-7 flex flex-col bg-white border-2 border-slate-100 p-6 md:p-8 rounded-[32px] shadow-sm justify-between relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-600" />
                  
                  <div className="flex-grow flex flex-col justify-center min-h-[220px]">
                    {loading ? (
                      <div className="flex flex-col items-center space-y-3 py-10">
                        <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                          Hanova processing...
                        </span>
                      </div>
                    ) : aiAnswer ? (
                      <div className="space-y-4 py-2">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="h-4.5 w-4.5 text-blue-600 shrink-0" />
                            <span className="text-[10px] font-mono font-extrabold tracking-widest uppercase text-slate-400">
                              {selectedHistoryItem ? 'Archived Response' : 'Interactive Response'}
                            </span>
                          </div>
                          <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase">Verified</span>
                        </div>
                        <div className="markdown-body text-slate-800 max-h-[360px] overflow-y-auto pr-2">
                          {renderFormattedResponse(aiAnswer)}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-center space-y-5 py-4 w-full">
                        <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-blue-600 animate-pulse">
                          <Sparkles className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                          <h3 className={`text-xl font-black tracking-tight uppercase ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            Hanova Student AI Helper
                          </h3>
                          <p className={`text-[10px] font-extrabold uppercase tracking-widest ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                            Somaliland & Somali Smart Classroom Companion
                          </p>
                          <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">
                            Synthesize snapshot images, study documents, or type homework queries to receive step-by-step guidance.
                          </p>
                        </div>

                        {/* Quick Study Assistant Prompt Triggers */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left mt-2">
                          {[
                            {
                              title: "Xallinta Xisaabta (Math Explainer)",
                              desc: "Analyze snapshots of formulas & equations step-by-step.",
                              prompt: "Fadlan ii falanqee oo tillaabo-tillaabo ii tus xallinta dhibaatadan xisaabeed (Explain this math problem with step-by-step steps): ",
                              colorBg: "bg-emerald-50/10 border-emerald-100/50 hover:bg-emerald-50/20 hover:border-emerald-300",
                              darkColor: "border-slate-800 hover:border-emerald-500/30"
                            },
                            {
                              title: "Turjumaad (Somali Translation)",
                              desc: "Translate textbook files or snapshots into Somali.",
                              prompt: "Fadlan mawaadiicda iyo qoraalladan u turjun Af-Soomaali fudud oo sharraxan (Translate this text or snapshot document contents into simple, clear Somali): ",
                              colorBg: "bg-blue-50/10 border-blue-100/50 hover:bg-blue-50/20 hover:border-blue-300",
                              darkColor: "border-slate-800 hover:border-blue-500/30"
                            },
                            {
                              title: "Sharaxaad Saynis (Science & Physics)",
                              desc: "Break down scientific rules, chemistry, and phenomena.",
                              prompt: "Fadlan iigu sharrax si fudud oo cilmiyaysan habraacan iyo foomulooyinka halkan ku sheegan (Explain simply the scientific formula, chemical rules, or physical laws): ",
                              colorBg: "bg-amber-50/10 border-amber-100/50 hover:bg-amber-50/20 hover:border-amber-300",
                              darkColor: "border-slate-800 hover:border-amber-500/30"
                            },
                            {
                              title: "Buug Falanqayn (Book Analyzer)",
                              desc: "Synthesize textbook paragraphs, summaries & critiques.",
                              prompt: "Fadlan ka bixi falanqayn xeeldheer iyo qodobbo kooban oo ku saabsan dukumentigan ama cutubkan (Provide a comprehensive document thesis synthesis & itemized summary list): ",
                              colorBg: "bg-purple-50/10 border-purple-100/50 hover:bg-purple-50/20 hover:border-purple-300",
                              darkColor: "border-slate-800 hover:border-purple-500/30"
                            }
                          ].map((item, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setPromptText(item.prompt);
                                setError('');
                              }}
                              className={`p-3.5 border-2 rounded-2xl text-left transition-all hover:scale-[1.01] flex flex-col justify-between cursor-pointer group ${
                                isDarkMode ? item.darkColor + " bg-slate-800/20" : item.colorBg
                              }`}
                            >
                              <span className={`text-[11px] font-black uppercase tracking-wide block ${isDarkMode ? 'text-slate-100' : 'text-slate-850'}`}>
                                {item.title}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium leading-relaxed mt-1 block">
                                {item.desc}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Inputs control actions drawer (5 cols) */}
                <div className="lg:col-span-5 flex flex-col bg-white border-2 border-slate-100 p-6 md:p-8 rounded-[32px] shadow-sm justify-between gap-6 relative">
                  <div className="space-y-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-lg font-black uppercase text-slate-900 mb-1">Upload Portal</h4>
                      <p className="text-xs text-slate-400 font-medium">Add media objects to synthesize workspace telemetry.</p>
                    </div>

                    {error && (
                      <div className="p-3.5 bg-red-50 border-2 border-red-100 rounded-xl text-red-600 text-xs font-bold flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{error}</span>
                      </div>
                    )}

                    {/* Drag and Drop Box */}
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 relative flex flex-col items-center justify-center min-h-[160px] ${
                        dragActive
                          ? 'border-blue-600 bg-blue-50/40'
                          : 'border-slate-200 bg-slate-50 hover:border-slate-400 hover:bg-slate-100/50'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".txt,image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />

                      {file ? (
                        <div className="flex items-center justify-between bg-white border border-slate-200 p-3.5 rounded-xl w-full max-w-xs relative z-10" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center space-x-3 text-left">
                            {fileType === 'photo' ? (
                              filePreview ? (
                                <img src={filePreview} alt="Preview" className="h-10 w-10 object-cover rounded-lg border border-slate-200" />
                              ) : (
                                <ImageIcon className="h-8 w-8 text-blue-600" />
                              )
                            ) : (
                              <FileText className="h-8 w-8 text-blue-600" />
                            )}
                            <div className="max-w-[130px] truncate">
                              <p className="text-xs font-black text-slate-900 truncate">{file.name}</p>
                              <p className="text-[9px] text-slate-400 font-mono uppercase tracking-wider">{fileType === 'photo' ? 'Photo Asset' : 'Text Doc'}</p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={clearFileSelection}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="inline-flex items-center justify-center p-3 bg-white border border-slate-200 rounded-xl text-slate-500 shadow-sm">
                            <Upload className="h-5 w-5 text-slate-900" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-900">
                              Drop document / photo or <span className="text-blue-600">browse</span>
                            </p>
                            <p className="text-[9px] text-slate-400 mt-1 font-mono uppercase tracking-wider">
                              Supports Jpeg, Png or .txt files
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Text Input Block */}
                    <form onSubmit={handleAskHanova} className="relative mt-4">
                      <div className={`flex items-center border-2 rounded-2xl p-2 relative ${
                        isDarkMode 
                          ? 'bg-[#1E293B] border-slate-800' 
                          : 'bg-[#FAFAFA] border-slate-150'
                      }`}>
                        <input
                          type="text"
                          value={promptText}
                          onChange={(e) => setPromptText(e.target.value)}
                          placeholder="Ask anything, explain concepts or study assignments here..."
                          className={`flex-grow bg-transparent text-xs focus:outline-none py-3 px-3 font-sans ${
                            isDarkMode 
                              ? 'text-slate-100 placeholder-slate-500' 
                              : 'text-slate-950 placeholder-slate-400'
                          }`}
                        />
                        <button
                          type="submit"
                          disabled={loading || (!promptText.trim() && !fileBase64)}
                          className={`rounded-xl p-3 aspect-square flex items-center justify-center cursor-pointer transition-all shrink-0 shadow-sm hover:scale-[1.02] ${
                            isDarkMode 
                              ? 'bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white' 
                              : 'bg-slate-900 hover:bg-blue-600 disabled:bg-slate-250 text-white'
                          }`}
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      </div>
                    </form>

                  </div>
                </div>

              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div
                key="history-tab"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="bg-white border-2 border-slate-100 p-6 md:p-8 rounded-[32px] shadow-sm flex-1 space-y-6"
              >
                <div className="flex justify-between items-center pb-4 border-b border-slate-150">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Interactive Ledger History</h3>
                  <button
                    type="button"
                    onClick={fetchHistory}
                    className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs text-slate-600 font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200 shadow-sm"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Sync</span>
                  </button>
                </div>

                {historyLoading ? (
                  <div className="flex justify-center py-16">
                    <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
                  </div>
                ) : chatHistory.length === 0 ? (
                  <div className="text-center py-16 space-y-4">
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-full w-14 h-14 flex items-center justify-center mx-auto text-slate-400">
                      <History className="h-6 w-6" />
                    </div>
                    <p className="text-slate-900 text-sm font-black uppercase">Your history logs are empty</p>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto font-medium">Start submitting files in the assistant hub to view historic intelligence transcripts.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[485px] overflow-y-auto pr-2">
                    {chatHistory.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => loadFromHistory(item)}
                        className="bg-slate-50 hover:bg-white border-2 border-slate-100 rounded-2xl p-5 cursor-pointer text-left transition-all duration-200 hover:border-blue-500/80 flex justify-between gap-4 items-center group relative shadow-sm"
                      >
                        <div className="space-y-2 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-mono uppercase bg-blue-50 border border-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-extrabold tracking-wider">
                              {item.type === 'photo' ? 'Photo Asset' : item.type === 'text_file' ? 'Text Doc' : 'Direct Text'}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 font-bold">
                              {new Date(item.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                          
                          <p className="text-slate-900 text-sm font-black truncate uppercase tracking-tight">
                            {item.promptText || '(File analyzing)'}
                          </p>

                          {item.fileName && (
                            <p className="text-[10px] font-mono text-slate-500 truncate flex items-center gap-1 font-bold">
                              <FileText className="h-3 w-3 shrink-0" />
                              <span>{item.fileName}</span>
                            </p>
                          )}
                        </div>

                        <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div
                key="settings-tab"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className={`border-2 p-6 md:p-8 rounded-[32px] shadow-sm flex-1 space-y-6 transition-colors duration-200 ${
                  isDarkMode ? 'bg-[#182235] border-slate-800/80 text-white' : 'bg-white border-slate-100'
                }`}
              >
                {/* Headers configuration suboptions */}
                <div className={`flex border-b pb-px mb-6 transition-colors ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                  <button
                    type="button"
                    onClick={() => setSettingsSection('profile')}
                    className={`pb-3 text-xs font-mono font-black uppercase tracking-widest px-4 relative transition-all cursor-pointer ${
                      settingsSection === 'profile' 
                        ? isDarkMode ? 'text-white' : 'text-slate-900' 
                        : isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Account Profile
                    {settingsSection === 'profile' && (
                      <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${isDarkMode ? 'bg-white' : 'bg-slate-900'}`} />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettingsSection('privacy')}
                    className={`pb-3 text-xs font-mono font-black uppercase tracking-widest px-4 relative transition-all cursor-pointer ${
                      settingsSection === 'privacy' 
                        ? isDarkMode ? 'text-white' : 'text-slate-900' 
                        : isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Privacy & Policy
                    {settingsSection === 'privacy' && (
                      <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${isDarkMode ? 'bg-white' : 'bg-slate-900'}`} />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettingsSection('about')}
                    className={`pb-3 text-xs font-mono font-black uppercase tracking-widest px-4 relative transition-all cursor-pointer ${
                      settingsSection === 'about' 
                        ? isDarkMode ? 'text-white' : 'text-slate-900' 
                        : isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    About Hanova
                    {settingsSection === 'about' && (
                      <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${isDarkMode ? 'bg-white' : 'bg-slate-900'}`} />
                    )}
                  </button>
                </div>

                {settingsSection === 'profile' && (
                  <div className="space-y-6 max-w-xl text-left">
                    <div className={`flex items-center space-x-4 border-2 p-6 rounded-3xl shadow-sm transition-colors ${
                      isDarkMode ? 'bg-slate-800/50 border-slate-705/80' : 'bg-slate-50 border-slate-100'
                    }`}>
                      <div className={`p-4 border rounded-2xl text-blue-600 shadow-sm shrink-0 ${
                        isDarkMode ? 'bg-slate-900/60 border-slate-700' : 'bg-white border-slate-200'
                      }`}>
                        <UserIcon className="h-7 w-7" />
                      </div>
                      <div className="min-w-0">
                        <h4 className={`text-xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{user.name}</h4>
                        <p className="text-xs text-slate-400 font-mono font-bold mt-0.5">{user.gmail}</p>
                      </div>
                    </div>

                    {/* Enable Dark Mode Switch */}
                    <div className={`border-2 p-5 rounded-3xl flex items-center justify-between shadow-sm transition-all duration-200 ${
                      isDarkMode ? 'bg-slate-800/50 border-slate-705/80' : 'bg-white border-slate-150'
                    }`}>
                      <div className="space-y-1">
                        <p className={`font-black uppercase tracking-wider text-[11px] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>System Aesthetics</p>
                        <p className={`font-medium leading-normal text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Switch between light canvas and midnight dark layout themes.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsDarkMode(prev => !prev)}
                        className={`relative inline-flex h-6.5 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          isDarkMode ? 'bg-blue-600' : 'bg-slate-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            isDarkMode ? 'translate-x-5.55' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    <div className={`grid grid-cols-2 gap-4 border-2 rounded-3xl p-5 text-xs font-bold uppercase transition-colors ${
                      isDarkMode ? 'bg-slate-800/50 border-slate-705/80' : 'bg-slate-50 border-slate-100'
                    }`}>
                      <div>
                        <span className="text-slate-400 block tracking-wider font-mono text-[9px] mb-1">Assigned Plan</span>
                        <span className={`font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{user.plan}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block tracking-wider font-mono text-[9px] mb-1">Registration Date</span>
                        <span className={`font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{new Date(user.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className={`p-5 border-2 rounded-3xl space-y-2 text-xs transition-colors ${
                      isDarkMode ? 'bg-slate-800/30 border-slate-750' : 'bg-white border-slate-200'
                    }`}>
                      <p className={`font-extrabold uppercase tracking-wider text-[11px] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Need to modify subscription?</p>
                      <p className={`font-medium leading-relaxed font-sans text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>You can change your Hanova plan tiers at any time to unlock advanced text processing capabilities instantly.</p>
                      <button
                        type="button"
                        onClick={onUpgradePrompt}
                        className="text-xs font-black text-blue-605 hover:text-blue-500 mt-2 block transition-all uppercase tracking-wider font-mono cursor-pointer"
                      >
                        Select Different Plan &rarr;
                      </button>
                    </div>
                  </div>
                )}

                {settingsSection === 'privacy' && (
                  <div className={`border-2 rounded-3xl p-6 text-left max-h-[380px] overflow-y-auto space-y-4 transition-colors ${
                    isDarkMode ? 'bg-slate-800/30 border-slate-750' : 'bg-slate-55 border-slate-100'
                  }`}>
                    <div className={`flex items-center gap-2 pb-3.5 border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-250'}`}>
                      <Shield className="h-5 w-5 text-blue-600 shrink-0" />
                      <h4 className={`text-base font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Trust, Privacy & Policy Statement</h4>
                    </div>
                    
                    <p className="text-xs text-slate-400 leading-normal font-bold">
                      <strong>Last Updated: May 23, 2026</strong>
                    </p>

                    <p className={`text-xs leading-relaxed font-sans font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      Welcome to Hanova. We are fully committed to guaranteeing pristine compliance, security, and integrity with your interactions, accounts, and personal data. Under MHHS GAME INC framework structure, we align with the following standard guidelines:
                    </p>

                    <h5 className={`text-xs font-black uppercase tracking-wider font-mono mt-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>1. Data Storage & Local Database</h5>
                    <p className={`text-xs leading-relaxed font-sans font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      All accounts registration inputs (names, emails) and chat log lists are saved locally in private sandboxed databases inside the server boundaries. We implement modern parameters to ensure zero third-party disclosure.
                    </p>

                    <h5 className={`text-xs font-black uppercase tracking-wider font-mono mt-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>2. Payment Integrity (Zaad / Somaliland)</h5>
                    <p className={`text-xs leading-relaxed font-sans font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Subscribed transactions are manually verified on a 2-5 minutes queue structure by designated operators. No credit-score, banking secrets, or direct wallets are linked nor cached inside our server variables.
                    </p>

                    <h5 className={`text-xs font-black uppercase tracking-wider font-mono mt-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>3. Premium AI Usage guidelines</h5>
                    <p className={`text-xs leading-relaxed font-sans font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Files and typed prompts dispatched to Gemini 3 series engines are filtered of PII. We strictly uphold data transparency laws. You have full privileges to clear histories on demand.
                    </p>
                  </div>
                )}

                {settingsSection === 'about' && (
                  <div className={`border-2 rounded-3xl p-6 text-left max-h-[380px] overflow-y-auto space-y-4 transition-colors ${
                    isDarkMode ? 'bg-slate-800/30 border-slate-750' : 'bg-slate-55 border-slate-100'
                  }`}>
                    <div className={`flex items-center gap-2 pb-3.5 border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-250'}`}>
                      <Sparkles className="h-5 w-5 text-blue-600 shrink-0" />
                      <h4 className={`text-base font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>About Hanova Assistant</h4>
                    </div>

                    <div className="space-y-3">
                      <p className={`text-xs leading-relaxed font-sans font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                        <strong>Hanova</strong> is a state of the art modular intelligent helper applet developed by <span className="font-bold">MHHS GAME INC</span> in 2026. Specially optimized for Somaliland, Somali, and international classrooms, Hanova aims to redefine digital learning and text document synthesis for students, scholars, and lifelong learners.
                      </p>

                      <p className={`text-xs leading-relaxed font-sans font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                        From analyzing formulas in snapshot image captures to breaking down historical documents and explaining code logic in natural conversational Somali or English, our workspace bridges the gap between state-of-the-art neural intelligence and accessible, client-first tuition.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                      <div className={`p-4 border rounded-2xl ${isDarkMode ? 'border-slate-750 bg-slate-800/30' : 'border-slate-200 bg-white'}`}>
                        <span className="block text-[10px] font-mono uppercase text-slate-405 font-extrabold tracking-wider">Developer & Publisher</span>
                        <span className={`text-xs font-black uppercase mt-1 block ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>MHHS GAME INC &copy; 2026</span>
                      </div>
                      <div className={`p-4 border rounded-2xl ${isDarkMode ? 'border-slate-750 bg-slate-800/30' : 'border-slate-200 bg-white'}`}>
                        <span className="block text-[10px] font-mono uppercase text-slate-405 font-extrabold tracking-wider">Engine Power</span>
                        <span className={`text-xs font-black uppercase mt-1 block ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Gemini Research Network</span>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Corporate App Credits */}
        <footer className={`mt-8 pt-6 border-t flex flex-col sm:flex-row justify-between items-center text-[10px] font-extrabold uppercase tracking-widest gap-2 transition-colors ${
          isDarkMode ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'
        }`}>
          <span>MHHS GAME INC &copy; 2026</span>
          <span>Secure AI Processing Hub</span>
        </footer>
      </main>

      {/* Liquid Glass Square Notification Toast */}
      <AnimatePresence>
        {showSuccessNotification && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            id="hanova-ai-success-toast"
            className="fixed bottom-6 right-6 z-50 w-[350px] max-w-[calc(100vw-3rem)] text-left"
          >
            {/* Shimming liquid accent bubbles right behind the frame */}
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/30 via-indigo-500/30 to-purple-600/30 blur-xl opacity-80 -z-10 animate-[pulse_3s_infinite]" />
            
            {/* Liquid Glass Pane: perfectly square (rounded-none), double-bordered, frosted translucency */}
            <div className={`relative overflow-hidden border-2 rounded-none p-5 shadow-[0_20px_50px_rgba(30,41,59,0.25)] flex gap-3.5 ${
              isDarkMode 
                ? 'bg-slate-900/75 border-slate-700/60 text-white backdrop-blur-xl' 
                : 'bg-white/70 border-white/60 text-slate-900 backdrop-blur-xl'
            }`}>
              
              {/* Dynamic glossy glass highlight line crossing the top */}
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-blue-500/80 to-transparent opacity-80" />

              {/* Status Neon Indicator Strip */}
              <div className="w-1.5 bg-gradient-to-b from-blue-500 via-indigo-500 to-purple-600 self-stretch shrink-0" />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Sparkles className="h-4 w-4 text-blue-500 shrink-0 animate-pulse" />
                  <span className="text-[10px] font-mono font-black uppercase tracking-[0.25em] text-blue-650 dark:text-blue-400">
                    HANOVA AI HELPER
                  </span>
                </div>
                
                <h4 className="text-xs font-black uppercase tracking-wider leading-snug">
                  Jawaabtii Waa Diyaar! 🎉
                </h4>
                
                <p className={`text-[11px] font-medium leading-relaxed mt-2 ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-600'
                }`}>
                  Falanqaynta casharkaaga si toos ah ayaa loo diyaariyay. Fadlan ka eeg sanduuqa jawaabaha!
                </p>

                {/* Animated progress indicator - matches 8000ms custom auto-close */}
                <div className="mt-4 bg-slate-200/30 dark:bg-slate-800/40 h-1.5 w-full overflow-hidden border border-transparent">
                  <motion.div 
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: 8, ease: "linear" }}
                    className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600"
                  />
                </div>
              </div>

              {/* Close controls with crisp square outline */}
              <button
                type="button"
                onClick={() => setShowSuccessNotification(false)}
                className={`p-1.5 self-start transition-all cursor-pointer rounded-none border border-transparent ${
                  isDarkMode 
                    ? 'text-slate-400 hover:text-white hover:bg-white/10 hover:border-slate-800' 
                    : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100/80 hover:border-slate-200'
                }`}
              >
                <X className="h-3.5 w-3.5" />
              </button>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
