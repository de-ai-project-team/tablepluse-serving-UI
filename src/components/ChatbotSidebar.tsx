import React, { useState } from 'react';
import { X, Send, Bot, User, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { ChatMessage } from '../types';

interface ChatbotSidebarProps {
  isOpen: boolean;
  close: () => void;
}

export function ChatbotSidebar({ isOpen, close }: ChatbotSidebarProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'ai',
      text: '안녕하세요! TABLEPULSE AI 비서입니다. 오늘 닭가슴살 및 소고기 등심의 품절 위험이 감지되었습니다. 재고나 발주에 대해 무엇이든 물어보세요.',
      timestamp: '방금 전'
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || isSending) return;

    const userText = inputVal;
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: userText,
      timestamp: '방금 전'
    };

    setMessages(prev => [...prev, userMsg]);
    setInputVal('');
    setIsSending(true);

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ question: userText })
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 502 || data.error === 'bedrock_unavailable') {
          throw new Error('AI 응답을 사용할 수 없습니다');
        }
        throw new Error(data.error || '요청 처리 중 오류가 발생했습니다.');
      }

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: data.answer,
        timestamp: '방금 전'
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: err.message === 'AI 응답을 사용할 수 없습니다' ? 'AI 응답을 사용할 수 없습니다' : '죄송합니다. 응답을 생성하는 중 오류가 발생했습니다.',
        timestamp: '방금 전'
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 460, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="border-l border-border bg-surface shrink-0 h-full overflow-hidden flex flex-col transition-colors duration-300 shadow-2xl z-30"
        >
          {/* Fixed width container prevents text reflow during slide animation */}
          <div className="w-[460px] flex-1 flex flex-col h-full">
            <header className="h-20 flex items-center justify-between px-6 border-b border-border shrink-0 bg-surface transition-colors duration-300">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500 font-bold text-base shadow-sm">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-text-primary">TABLEPULSE AI 비서</h3>
                  <p className="text-sm text-text-secondary">실시간 재고 및 발주 도우미</p>
                </div>
              </div>
              <button onClick={close} className="p-3 text-text-secondary hover:text-text-primary rounded-xl hover:bg-surface-hover transition-colors">
                <X className="w-6 h-6" />
              </button>
            </header>

            {/* Chat Messages List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.sender === 'ai' && (
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-1">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}
                  <div className={`p-4 rounded-2xl max-w-[80%] text-base leading-relaxed shadow-sm ${
                    msg.sender === 'user' 
                      ? 'bg-blue-600 text-white rounded-br-none whitespace-pre-wrap' 
                      : 'bg-background border border-border text-text-primary rounded-bl-none prose prose-sm dark:prose-invert max-w-none'
                  }`}>
                    {msg.sender === 'ai' ? (
                      <div className="markdown-body">
                        <Markdown>{msg.text}</Markdown>
                      </div>
                    ) : (
                      <p>{msg.text}</p>
                    )}
                    <span className="text-[11px] opacity-70 mt-1.5 block text-right">{msg.timestamp}</span>
                  </div>
                  {msg.sender === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center shrink-0 shadow-sm mt-1">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Chat Input Bar integrated into AI Sidebar */}
            <div className="p-6 border-t border-border bg-surface shrink-0 transition-colors duration-300">
              <form onSubmit={handleSend} className="relative">
                <input
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder="예: 지금 닭가슴살 얼마나 남았어?"
                  className="w-full bg-background border border-border rounded-xl pl-5 pr-14 py-4 text-base text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
                />
                <button
                  type="submit"
                  disabled={isSending || !inputVal.trim()}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg transition-colors shadow-sm"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
