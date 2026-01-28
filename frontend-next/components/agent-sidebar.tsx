'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, X, Sparkles, User, Loader2 } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AgentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  pageContent?: string;
  pageTitle?: string;
}

export function AgentSidebar({ isOpen, onClose, pageContent, pageTitle }: AgentSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build context from page content
      const context = pageContent
        ? `Current page title: "${pageTitle || 'Untitled'}"\n\nPage content:\n${pageContent.slice(0, 10000)}`
        : '';

      const systemPrompt = `You are Agent D, an AI assistant for the Distillai knowledge platform.
You help users understand, analyze, and work with their notes and summaries.
${context ? `\nHere is the context of the current page the user is viewing:\n${context}\n` : ''}
Respond in Korean. Be helpful, concise, and insightful.`;

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${systemPrompt}\n\nUser: ${userMessage.content}\n\nAssistant:`,
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessage.id
              ? { ...msg, content: msg.content + text }
              : msg
          )
        );
      }
    } catch (error) {
      console.error('Agent error:', error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="md:hidden fixed inset-0 z-40 bg-black/60"
        onClick={onClose}
      />

      {/* Agent panel - full screen on mobile, sidebar on desktop */}
      <div className="fixed md:relative inset-0 md:inset-auto z-50 md:z-auto w-full md:w-80 h-screen bg-zinc-900 md:border-l border-zinc-800 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-white text-sm">Agent D</h2>
            <p className="text-xs text-zinc-500">AI 어시스턴트</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-4">
              <Sparkles size={24} className="text-zinc-600" />
            </div>
            <h3 className="font-medium text-white mb-2">안녕하세요!</h3>
            <p className="text-sm text-zinc-500">
              페이지 내용에 대해 궁금한 점이나<br />
              도움이 필요한 것이 있으면 물어보세요.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                  <Sparkles size={14} className="text-white" />
                </div>
              )}
              <div
                className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
                  message.role === 'user'
                    ? 'bg-cyan-500 text-zinc-900'
                    : 'bg-zinc-800 text-zinc-200'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
              {message.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-zinc-700 flex items-center justify-center flex-shrink-0">
                  <User size={14} className="text-zinc-300" />
                </div>
              )}
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
              <Sparkles size={14} className="text-white" />
            </div>
            <div className="bg-zinc-800 px-3 py-2 rounded-xl">
              <Loader2 size={16} className="text-zinc-400 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-zinc-800">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요..."
            rows={1}
            className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 resize-none focus:outline-none focus:border-cyan-500 transition-colors text-sm"
            style={{ minHeight: '40px', maxHeight: '120px' }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-900 rounded-xl transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
    </>
  );
}
