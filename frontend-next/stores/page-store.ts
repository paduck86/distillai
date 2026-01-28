'use client';

import { create } from 'zustand';
import type { Page, PageTreeItem } from '@/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface PageState {
  pages: Page[];
  pageTree: PageTreeItem[];
  currentPage: Page | null;
  loading: boolean;

  // Actions
  fetchPages: (token: string) => Promise<void>;
  fetchPage: (id: string, token: string) => Promise<Page | null>;
  createPage: (data: Partial<Page>, token: string) => Promise<Page | null>;
  updatePage: (id: string, data: Partial<Page>, token: string) => Promise<void>;
  deletePage: (id: string, token: string) => Promise<void>;
  setCurrentPage: (page: Page | null) => void;
  buildPageTree: () => void;
}

export const usePageStore = create<PageState>((set, get) => ({
  pages: [],
  pageTree: [],
  currentPage: null,
  loading: false,

  fetchPages: async (token: string) => {
    set({ loading: true });
    try {
      const res = await fetch(`${API_URL}/pages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch pages');
      const json = await res.json();
      // API returns { data: [...], meta: {...} }
      const pages = Array.isArray(json) ? json : (json.data || []);
      set({ pages, loading: false });
      get().buildPageTree();
    } catch (error) {
      console.error('Failed to fetch pages:', error);
      set({ pages: [], loading: false });
    }
  },

  fetchPage: async (id: string, token: string) => {
    set({ loading: true });
    try {
      const res = await fetch(`${API_URL}/pages/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch page');
      const json = await res.json();
      // API returns { data: {...} }
      const page = json.data || json;
      set({ currentPage: page, loading: false });
      return page;
    } catch (error) {
      console.error('Failed to fetch page:', error);
      set({ loading: false });
      return null;
    }
  },

  createPage: async (data: Partial<Page>, token: string) => {
    try {
      const res = await fetch(`${API_URL}/pages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to create page');
      const json = await res.json();
      // API returns { data: {...} }
      const page = json.data || json;
      set(state => ({ pages: [...(state.pages || []), page] }));
      get().buildPageTree();
      return page;
    } catch (error) {
      console.error('Failed to create page:', error);
      return null;
    }
  },

  updatePage: async (id: string, data: Partial<Page>, token: string) => {
    try {
      const res = await fetch(`${API_URL}/pages/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to update page');
      const json = await res.json();
      // API returns { data: {...} }
      const updated = json.data || json;
      set(state => ({
        pages: (state.pages || []).map(p => p.id === id ? updated : p),
        currentPage: state.currentPage?.id === id ? updated : state.currentPage
      }));
      get().buildPageTree();
    } catch (error) {
      console.error('Failed to update page:', error);
    }
  },

  deletePage: async (id: string, token: string) => {
    try {
      const res = await fetch(`${API_URL}/pages/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete page');
      set(state => ({
        pages: state.pages.filter(p => p.id !== id),
        currentPage: state.currentPage?.id === id ? null : state.currentPage
      }));
      get().buildPageTree();
    } catch (error) {
      console.error('Failed to delete page:', error);
    }
  },

  setCurrentPage: (page: Page | null) => {
    set({ currentPage: page });
  },

  buildPageTree: () => {
    const { pages } = get();
    if (!pages || pages.length === 0) {
      set({ pageTree: [] });
      return;
    }

    const rootPages = pages.filter(p => !p.parentId);
    const visited = new Set<string>();

    const buildChildren = (parentId: string, depth = 0): PageTreeItem[] => {
      // Prevent infinite recursion - max depth of 10 and cycle detection
      if (depth > 10 || visited.has(parentId)) {
        return [];
      }
      visited.add(parentId);

      return pages
        .filter(p => p.parentId === parentId && p.id !== parentId)
        .map(p => ({
          id: p.id,
          title: p.title || 'Untitled',
          icon: p.icon,
          children: buildChildren(p.id, depth + 1)
        }));
    };

    const tree: PageTreeItem[] = rootPages.map(p => {
      visited.clear();
      return {
        id: p.id,
        title: p.title || 'Untitled',
        icon: p.icon,
        children: buildChildren(p.id, 0)
      };
    });

    set({ pageTree: tree });
  }
}));
