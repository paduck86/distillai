'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { usePageStore } from '@/stores/page-store';
import { SearchModal } from '@/components/search-modal';
import { ChevronRight, ChevronDown, Plus, Home, Search, LogOut, Menu, X } from 'lucide-react';
import type { PageTreeItem } from '@/lib/types';

interface SidebarProps {
  currentPageId?: string;
}

export function Sidebar({ currentPageId }: SidebarProps) {
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const { pageTree, createPage } = usePageStore();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showSearch, setShowSearch] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Keyboard shortcut for search (Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [currentPageId]);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const handleCreatePage = async () => {
    router.push('/dashboard');
    setIsMobileOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const renderTreeItem = (item: PageTreeItem, depth = 0) => {
    const isExpanded = expandedIds.has(item.id);
    const hasChildren = item.children.length > 0;
    const isActive = currentPageId === item.id;

    return (
      <div key={item.id}>
        <div
          className={`flex items-center gap-1 px-2 py-2 md:py-1.5 rounded-lg cursor-pointer group transition-colors active:bg-zinc-800 ${
            isActive
              ? 'bg-zinc-800 text-white'
              : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
          }`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(item.id);
              }}
              className="w-5 h-5 flex items-center justify-center hover:bg-zinc-700 rounded"
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : (
            <div className="w-5" />
          )}

          <Link
            href={`/page/${item.id}`}
            className="flex-1 flex items-center gap-2 truncate"
            onClick={() => setIsMobileOpen(false)}
          >
            <span className="text-base">{item.icon || '📄'}</span>
            <span className="text-sm truncate">{item.title || 'Untitled'}</span>
          </Link>

          <button
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-zinc-700 rounded transition-opacity"
          >
            <Plus size={14} />
          </button>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {item.children.map((child) => renderTreeItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="p-4 pt-safe border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 md:w-8 md:h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center">
            <span className="text-white text-sm font-bold">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.user_metadata?.display_name || user?.email || 'User'}
            </p>
          </div>
          {/* Mobile close button */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden p-2.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors active:bg-zinc-700"
            aria-label="메뉴 닫기"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="p-2 space-y-1">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2.5 md:py-2 text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 rounded-lg transition-colors active:bg-zinc-800"
          onClick={() => setIsMobileOpen(false)}
        >
          <Home size={18} />
          <span className="text-sm">홈</span>
        </Link>
        <button
          onClick={() => {
            setShowSearch(true);
            setIsMobileOpen(false);
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 md:py-2 text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 rounded-lg transition-colors active:bg-zinc-800"
        >
          <Search size={18} />
          <span className="text-sm">검색</span>
          <span className="ml-auto text-xs text-zinc-600 hidden md:inline">⌘K</span>
        </button>
      </div>

      {/* Pages */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs font-medium text-zinc-500 uppercase">페이지</span>
          <button
            onClick={handleCreatePage}
            className="w-5 h-5 flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="space-y-0.5">
          {pageTree.length === 0 ? (
            <p className="px-3 py-2 text-sm text-zinc-500">페이지가 없습니다</p>
          ) : (
            pageTree.map((item) => renderTreeItem(item))
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-zinc-800 pb-safe">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 md:py-2 text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 rounded-lg transition-colors active:bg-zinc-800"
        >
          <LogOut size={18} />
          <span className="text-sm">로그아웃</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-40 p-2.5 bg-zinc-900/95 backdrop-blur-sm border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors shadow-lg active:scale-95"
        aria-label="메뉴 열기"
      >
        <Menu size={22} />
      </button>

      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar - Desktop */}
      <div className="hidden md:flex w-64 h-screen bg-zinc-900 border-r border-zinc-800 flex-col">
        {sidebarContent}
      </div>

      {/* Sidebar - Mobile (slide-out drawer) */}
      <div
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] bg-zinc-900 border-r border-zinc-800 flex flex-col transform transition-transform duration-300 ease-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>

      {/* Search Modal */}
      <SearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} />
    </>
  );
}
