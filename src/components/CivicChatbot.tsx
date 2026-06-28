import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  X, 
  Send, 
  Bot, 
  Sparkles, 
  HelpCircle,
  Layers,
  AlertCircle,
  Volume2,
  Eye,
  EyeOff
} from 'lucide-react';
import { Language } from '../translations.js';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

interface CivicChatbotProps {
  lang: Language;
}

const localTranslations: Record<Language, {
  header_title: string;
  header_subtitle: string;
  placeholder: string;
  welcome_msg: string;
  how_to_report: string;
  what_categories: string;
  latest_issues_q: string;
  draft_help: string;
  offline_warning: string;
  error_msg: string;
}> = {
  en: {
    header_title: "FactTrace AI Agent",
    header_subtitle: "Civic Assistant",
    placeholder: "Ask about reports, active issues, or categories...",
    welcome_msg: "Hello! I am your FactTrace Civic Assistant. I can check current reported issues in our database, help you categorize a report, or help you draft a detailed description for a local issue. What's on your mind?",
    how_to_report: "How do I file a report?",
    what_categories: "Explain the categories",
    latest_issues_q: "What issues are currently reported?",
    draft_help: "Draft a description for a water leak",
    offline_warning: "Gemini running in simulated offline mode",
    error_msg: "I encountered an error trying to connect to Gemini. Please try sending your message again."
  },
  gu: {
    header_title: "ફેક્ટટ્રેસ એઆઈ એજન્ટ",
    header_subtitle: "નાગરિક મદદનીશ",
    placeholder: "અહેવાલો, સક્રિય સમસ્યાઓ અથવા શ્રેણીઓ વિશે પૂછો...",
    welcome_msg: "નમસ્તે! હું તમારો ફેક્ટટ્રેસ સિવિક આસિસ્ટન્ટ છું. હું ડેટાબેઝમાં નોંધાયેલી વર્તમાન સમસ્યાઓ તપાસી શકું છું, અહેવાલની શ્રેણી નક્કી કરવામાં મદદ કરી શકું છું અથવા સ્થાનિક સમસ્યા માટે વિગતવાર વર્ણન લખી શકું છું. તમે શું જાણવા માંગો છો?",
    how_to_report: "હું અહેવાલ કેવી રીતે ફાઇલ કરું?",
    what_categories: "શ્રેણીઓ સમજાવો",
    latest_issues_q: "હાલમાં કઈ કઈ સમસ્યાઓ નોંધાયેલ છે?",
    draft_help: "પાણીના લીકેજ માટે અહેવાલ તૈયાર કરો",
    offline_warning: "જેમિની ઑફલાઇન મોડમાં ચાલી રહ્યું છે",
    error_msg: "જેમિની સાથે જોડાવામાં સમસ્યા આવી. કૃપા કરીને તમારો સંદેશ ફરી મોકલો."
  },
  hi: {
    header_title: "फैक्टट्रेस एआई एजेंट",
    header_subtitle: "नागरिक सहायक",
    placeholder: "रिपोर्ट, सक्रिय समस्याओं या श्रेणियों के बारे में पूछें...",
    welcome_msg: "नमस्ते! मैं आपका फैक्टट्रेस नागरिक सहायक हूँ। मैं हमारे डेटाबेस में दर्ज वर्तमान समस्याओं की जाँच कर सकता हूँ, रिपोर्ट की श्रेणी तय करने में मदद कर सकता हूँ, या किसी स्थानीय समस्या का विवरण तैयार करने में आपकी सहायता कर सकता हूँ। आप क्या जानना चाहते हैं?",
    how_to_report: "मैं रिपोर्ट कैसे दर्ज करूं?",
    what_categories: "श्रेणियों को विस्तार से समझाएं",
    latest_issues_q: "अभी कौन सी समस्याएं दर्ज हैं?",
    draft_help: "पानी के रिसाव के लिए रिपोर्ट तैयार करें",
    offline_warning: "जेमिनी सिम्युलेटेड ऑफ़लाइन मोड में है",
    error_msg: "जेमिनी से संपर्क स्थापित नहीं हो सका। कृपया अपना संदेश पुनः भेजने का प्रयास करें।"
  }
};

export default function CivicChatbot({ lang }: CivicChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(() => {
    try {
      return localStorage.getItem('civic_chatbot_hidden') === 'true';
    } catch {
      return false;
    }
  });
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: localTranslations[lang]?.welcome_msg || localTranslations.en.welcome_msg,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const t = localTranslations[lang] || localTranslations.en;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 100);
    }
  }, [isOpen, messages, isLoading]);

  // Handle changing language after initial render to update the welcome message if the conversation hasn't moved
  useEffect(() => {
    if (messages.length === 1 && messages[0].id === 'welcome') {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          text: t.welcome_msg,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, [lang]);

  const handleSend = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed) return;

    const userMsg: Message = {
      id: Math.random().toString(36).substring(7),
      role: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setApiError(null);

    try {
      const payloadMessages = [...messages, userMsg].map(msg => ({
        role: msg.role,
        text: msg.text
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messages: payloadMessages })
      });

      if (!res.ok) {
        throw new Error('API server error');
      }

      const data = await res.json();
      const assistantMsg: Message = {
        id: Math.random().toString(36).substring(7),
        role: 'assistant',
        text: data.text || 'I could not generate a response.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (error: any) {
      console.error('Failed to communicate with chat API:', error);
      setApiError(t.error_msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend(input);
    }
  };

  const renderFormattedText = (text: string, isAssistant: boolean) => {
    return text.split('\n').map((line, idx) => {
      let content: React.ReactNode = line;
      // Parse **bold** markdown tags
      const boldRegex = /\*\*(.*?)\*\*/g;
      if (boldRegex.test(line)) {
        const parts = line.split(boldRegex);
        content = parts.map((part, pIdx) => {
          if (pIdx % 2 === 1) {
            return (
              <strong 
                key={pIdx} 
                className={`font-extrabold ${isAssistant ? 'text-cyan-200 dark:text-cyan-200' : 'text-slate-900 dark:text-white'}`}
              >
                {part}
              </strong>
            );
          }
          return part;
        });
      }

      // Check if line represents a bullet list item
      const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ') || line.trim().startsWith('• ');
      if (isBullet) {
        const cleanLine = line.trim().replace(/^[-*•]\s+/, '');
        return (
          <div key={idx} className="flex gap-2 ml-2 my-1.5 leading-relaxed text-sm">
            <span className={`${isAssistant ? 'text-cyan-400' : 'text-blue-500'} font-bold`}>•</span>
            <div className="flex-1">{typeof content === 'string' ? cleanLine : content}</div>
          </div>
        );
      }

      return line.trim() === '' ? (
        <div key={idx} className="h-2" />
      ) : (
        <p 
          key={idx} 
          className={`my-1 text-sm leading-relaxed ${
            isAssistant ? 'text-slate-100 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'
          }`}
        >
          {content}
        </p>
      );
    });
  };

  const suggestions = [
    t.how_to_report,
    t.what_categories,
    t.latest_issues_q,
    t.draft_help
  ];

  if (isHidden) {
    return (
      <button
        onClick={() => {
          setIsHidden(false);
          localStorage.setItem('civic_chatbot_hidden', 'false');
        }}
        className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-bold rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/10"
        title="Show AI Assistant"
      >
        <Bot className="h-4 w-4 text-cyan-200 animate-pulse" />
        <span>{lang === 'en' ? 'Show AI' : lang === 'gu' ? 'એઆઈ બતાવો' : 'एआई दिखाएं'}</span>
      </button>
    );
  }

  return (
    <div id="civic_chatbot_widget" className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end">
      {/* Chat Window Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-[calc(100vw-2rem)] sm:w-[380px] md:w-[400px] h-[65vh] sm:h-[550px] bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden mb-2 sm:mb-4"
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-2xl backdrop-blur-sm">
                  <Bot className="h-5 w-5 text-cyan-200" />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-wide">{t.header_title}</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-blue-100 font-medium tracking-wider uppercase">{t.header_subtitle}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setIsHidden(true);
                    localStorage.setItem('civic_chatbot_hidden', 'true');
                    setIsOpen(false);
                  }}
                  className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition cursor-pointer"
                  title={lang === 'en' ? 'Hide Chatbot Button' : lang === 'gu' ? 'ચેટબોટ બટન છુપાવો' : 'चैटबॉट बटन छिपाएं'}
                >
                  <EyeOff className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Message History list */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50 dark:bg-slate-950/40">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-[#08363f] text-slate-100 rounded-bl-none border border-[#08363f]/30'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-1 text-[10px] font-black tracking-wider uppercase text-cyan-300 mb-1.5">
                        <Sparkles className="h-3 w-3 animate-pulse" />
                        <span>FactTrace AI</span>
                      </div>
                    )}
                    <div className="break-words">
                      {msg.role === 'user' ? (
                        <p className="text-sm leading-relaxed">{msg.text}</p>
                      ) : (
                        renderFormattedText(msg.text, true)
                      )}
                    </div>
                    <span
                      className={`text-[9px] block text-right mt-1.5 ${
                        msg.role === 'user' ? 'text-blue-200' : 'text-cyan-200/50'
                      }`}
                    >
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-[#08363f] border border-[#08363f]/30 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm max-w-[85%]">
                    <div className="flex items-center gap-1 text-[10px] font-black tracking-wider uppercase text-cyan-300 mb-1.5">
                      <Bot className="h-3.5 w-3.5 animate-bounce" />
                      <span>Assistant is thinking...</span>
                    </div>
                    <div className="flex items-center gap-1 py-1.5">
                      <span className="h-2 w-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:-0.3s]" />
                      <span className="h-2 w-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:-0.15s]" />
                      <span className="h-2 w-2 rounded-full bg-cyan-400 animate-bounce" />
                    </div>
                  </div>
                </div>
              )}

              {apiError && (
                <div className="flex gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 text-xs text-rose-600 dark:text-rose-400">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>{apiError}</p>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions scroll bar */}
            <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-1.5 overflow-x-auto scrollbar-none shrink-0 py-2.5">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSend(suggestion)}
                  disabled={isLoading}
                  className="px-3 py-1.5 text-[11px] font-semibold rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-950/30 dark:hover:border-blue-900/40 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-150 dark:border-slate-800/80 flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={t.placeholder}
                disabled={isLoading}
                className="flex-1 px-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 text-slate-800 dark:text-slate-100 transition disabled:opacity-75"
              />
              <button
                onClick={() => handleSend(input)}
                disabled={!input.trim() || isLoading}
                className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/15 transition cursor-pointer flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Button */}
      <div className="relative group">
        {!isOpen && (
          <button
            onClick={() => {
              setIsHidden(true);
              localStorage.setItem('civic_chatbot_hidden', 'true');
            }}
            className="absolute -top-2 -left-2 h-5 w-5 bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full flex items-center justify-center shadow border border-slate-300 dark:border-slate-700 hover:bg-rose-500 hover:text-white dark:hover:bg-rose-600 hover:border-transparent transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer z-10"
            title={lang === 'en' ? 'Hide Assistant' : lang === 'gu' ? 'સહાયક છુપાવો' : 'सहायक छिपाएं'}
          >
            <EyeOff className="h-3 w-3" />
          </button>
        )}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className="h-14 w-14 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white flex items-center justify-center shadow-xl shadow-blue-500/25 cursor-pointer relative"
          title="Open FactTrace Assistant"
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close-icon"
                initial={{ rotate: -45, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 45, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <X className="h-6 w-6" />
              </motion.div>
            ) : (
              <motion.div
                key="chat-icon"
                initial={{ rotate: 45, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -45, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center justify-center"
              >
                <MessageSquare className="h-6 w-6" />
                <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-amber-500 border-2 border-slate-50 dark:border-slate-900 animate-pulse" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );
}
