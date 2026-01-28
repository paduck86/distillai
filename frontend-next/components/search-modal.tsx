'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, FileText, Plus, Youtube, Mic, X } from 'lucide-react';
import { usePageStore } from '@/stores/page-store';
import { supabase } from '@/lib/supabase';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter();
  const { pages, createPage } = usePageStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const quickActions = [
    { id: 'new-page', label: '새 페이지', icon: Plus, action: 'create' },
    { id: 'youtube', label: 'YouTube 요약', icon: Youtube, action: 'youtube' },
    { id: 'record', label: '녹음', icon: Mic, action: 'record' },
  ];

  const filteredPages = pages.filter((page) =>
    page.title?.toLowerCase().includes(query.toLowerCase())
  );

  const allItems = [
    ...quickActions.map((a) => ({ type: 'action' as const, ...a })),
    ...filteredPages.map((p) => ({ type: 'page' as const, ...p })),
  ];

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, allItems.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          handleSelect(allItems[selectedIndex]);
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [isOpen, selectedIndex, allItems]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleSelect = async (item: (typeof allItems)[0]) => {
    if (item.type === 'action') {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      if (item.id === 'new-page') {
        const page = await createPage({ title: '', sourceType: 'note' }, session.access_token);
        if (page) {
          router.push(`/page/${page.id}`);
        }
      } else {
        const page = await createPage({ title: '', sourceType: 'note' }, session.access_token);
        if (page) {
          router.push(`/page/${page.id}?action=${item.action}`);
        }
      }
    } else {
      router.push(`/page/${item.id}`);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] md:pt-[20vh] px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-xl shadow-2xl overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
          <Search size={20} className="text-zinc-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="검색 또는 명령어 입력..."
            className="flex-1 bg-transparent text-white placeholder:text-zinc-500 outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 text-zinc-500 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[300px] overflow-y-auto">
          {allItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-zinc-500">
              결과가 없습니다
            </div>
          ) : (
            <div className="py-2">
              {/* Quick Actions */}
              {query === '' && (
                <div className="px-2 pb-2">
                  <p className="px-2 py-1 text-xs font-medium text-zinc-500 uppercase">
                    빠른 작업
                  </p>
                  {quickActions.map((action, index) => (
                    <button
                      key={action.id}
                      onClick={() => handleSelect({ type: 'action', ...action })}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        selectedIndex === index
                          ? 'bg-cyan-500/15 text-cyan-400'
                          : 'text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      <action.icon size={18} />
                      <span>{action.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Pages */}
              {filteredPages.length > 0 && (
                <div className="px-2">
                  <p className="px-2 py-1 text-xs font-medium text-zinc-500 uppercase">
                    페이지
                  </p>
                  {filteredPages.map((page, index) => {
                    const itemIndex = query === '' ? quickActions.length + index : index;
                    return (
                      <button
                        key={page.id}
                        onClick={() => handleSelect({ type: 'page', ...page })}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                          selectedIndex === itemIndex
                            ? 'bg-cyan-500/15 text-cyan-400'
                            : 'text-zinc-300 hover:bg-zinc-800'
                        }`}
                      >
                        <span className="text-base">{page.icon || '📄'}</span>
                        <span className="truncate">{page.title || 'Untitled'}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-zinc-800 flex items-center gap-4 text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-[10px]">↑↓</kbd>
            <span>탐색</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-[10px]">↵</kbd>
            <span>선택</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-[10px]">esc</kbd>
            <span>닫기</span>
          </span>
        </div>
      </div>
    </div>
  );
}
